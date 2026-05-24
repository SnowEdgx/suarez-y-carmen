import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import {
  pickSingleParam,
  resolveCheckoutCodeMessage,
  resolveStripeReturnMessage,
  type CheckoutMessage,
} from "@/lib/checkout-status";
import { DEVICE_ID_HEADER } from "@/lib/device-session";
import { normalizeDisplayText } from "@/lib/display-text";
import { createClient } from "@/lib/supabase/server";
import CourseDetailView from "./CourseDetailView";
import {
  resolveCourseResourceAccess,
  resolveResourceAccessMessage,
} from "./course-resource-access";
import {
  loadCompletedLessonIds,
  loadCourseLessons,
  loadCourseMetadata,
  loadCourseResources,
  loadPublishedCourse,
  resolveCoursePurchaseAccess,
} from "./course-detail.data";
import {
  resolveLessonMessage,
  resolveProgressMessage,
  UUID_REGEX,
} from "./course-detail.messages";
import {
  getCoursePath,
  getLessonPath,
} from "./course-detail.model";
import { resolveLessonVideoAccess, resolveVideoAccessMessage } from "./video-access";

type CourseDetailPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Pick<CourseDetailPageProps, "params">): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const data = await loadCourseMetadata(supabase, slug);

  if (!data?.is_published) {
    return {
      title: "Curso no encontrado",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = normalizeDisplayText(data.title, "Curso");
  const description = normalizeDisplayText(
    data.description,
    "Curso online de bachata de Suárez y Carmen con acceso controlado al contenido completo."
  );

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
    },
  };
}

export default async function CourseDetailPage({ params, searchParams }: CourseDetailPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const progressMessage = resolveProgressMessage(pickSingleParam(resolvedSearchParams?.progress));
  const checkoutMessage = resolveCheckoutCodeMessage(pickSingleParam(resolvedSearchParams?.checkout));
  const stripeSuccessParam = pickSingleParam(resolvedSearchParams?.success);
  const stripeCanceledParam = pickSingleParam(resolvedSearchParams?.canceled);
  const stripeSessionId = pickSingleParam(resolvedSearchParams?.session_id);
  const requestedLessonId = pickSingleParam(resolvedSearchParams?.lesson);

  const supabase = await createClient();
  const userPromise = supabase.auth.getUser();
  const sessionPromise = supabase.auth.getSession();
  const coursePromise = loadPublishedCourse(supabase, slug);
  const requestHeadersPromise = headers();

  const [
    {
      data: { user },
    },
    {
      data: { session },
    },
    course,
    requestHeaders,
  ] = await Promise.all([userPromise, sessionPromise, coursePromise, requestHeadersPromise]);

  const accessToken = session?.access_token ?? null;
  const deviceId = requestHeaders.get(DEVICE_ID_HEADER);
  const stripeReturnMessagePromise = resolveStripeReturnMessage({
    sessionId: stripeSessionId,
    wasSuccessful: stripeSuccessParam === "true",
    wasCanceled: stripeCanceledParam === "true",
    accessToken,
  });

  if (!course) {
    notFound();
  }

  const loadMessages: CheckoutMessage[] = [];
  const [lessonResult, resourceResult, purchaseResult, stripeReturnMessage] = await Promise.all([
    loadCourseLessons(supabase, course.id),
    loadCourseResources(supabase, course.id),
    resolveCoursePurchaseAccess(supabase, {
      userId: user?.id ?? null,
      courseId: course.id,
    }),
    stripeReturnMessagePromise,
  ]);

  const { lessons, message: lessonLoadMessage } = lessonResult;
  if (lessonLoadMessage) {
    loadMessages.push(lessonLoadMessage);
  }

  const { resources, message: resourceLoadMessage } = resourceResult;
  if (resourceLoadMessage) {
    loadMessages.push(resourceLoadMessage);
  }

  const { hasPurchased, purchaseCheckUnavailable, message: purchaseMessage } = purchaseResult;
  if (purchaseMessage) {
    loadMessages.push(purchaseMessage);
  }

  const previewLessons = lessons.filter((lesson) => lesson.is_free_preview);
  const accessibleLessons = hasPurchased ? lessons : previewLessons;
  const accessibleLessonIds = new Set(accessibleLessons.map((lesson) => lesson.id));
  const requestedLesson =
    requestedLessonId && UUID_REGEX.test(requestedLessonId)
      ? lessons.find((lesson) => lesson.id === requestedLessonId) ?? null
      : null;
  const isRequestedLessonAccessible = Boolean(
    requestedLesson && accessibleLessonIds.has(requestedLesson.id)
  );
  const lessonMessage = resolveLessonMessage({
    requestedLessonId,
    requestedLesson,
    isRequestedLessonAccessible,
  });
  const featuredLesson = isRequestedLessonAccessible ? requestedLesson : accessibleLessons[0] ?? null;
  const featuredLessonVideoAccess = featuredLesson
    ? await resolveLessonVideoAccess({
        lessonId: featuredLesson.id,
        accessToken,
        deviceId,
      })
    : { url: null, errorCode: null };
  const featuredLessonVideoUrl = featuredLessonVideoAccess.url;
  const featuredLessonVideoMessage = resolveVideoAccessMessage(featuredLessonVideoAccess.errorCode);
  const hasValidPrice = Number.isInteger(course.price_cents) && (course.price_cents as number) > 0;
  const resourceAccessEntries = await Promise.all(
    resources.map(async (resource) => {
      const access = await resolveCourseResourceAccess({
        resourceId: resource.id,
        accessToken,
      });

      return [
        resource.id,
        {
          url: access.url,
          errorMessage: resolveResourceAccessMessage(access.errorCode),
        },
      ] as const;
    })
  );
  const resourceAccessById = Object.fromEntries(resourceAccessEntries);

  const { completedLessonIds, message: progressLoadMessage } = await loadCompletedLessonIds(supabase, {
    userId: user?.id ?? null,
    accessibleLessons,
  });
  if (progressLoadMessage) {
    loadMessages.push(progressLoadMessage);
  }

  const completedLessonSet = new Set(completedLessonIds);
  const completedAccessibleLessons = accessibleLessons.filter((lesson) => completedLessonSet.has(lesson.id)).length;
  const progressPercent =
    accessibleLessons.length > 0 ? Math.round((completedAccessibleLessons / accessibleLessons.length) * 100) : 0;
  const statusMessages = [checkoutMessage, stripeReturnMessage, progressMessage, lessonMessage, ...loadMessages].filter(
    Boolean
  ) as CheckoutMessage[];
  const coursePath = getCoursePath(course.slug);
  const selectedLessonPath = featuredLesson ? getLessonPath(coursePath, featuredLesson.id) : coursePath;
  const checkoutReturnPath = requestedLesson ? getLessonPath(coursePath, requestedLesson.id) : selectedLessonPath;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-red-600 selection:text-white flex flex-col">
      <Navbar user={user} />
      <CourseDetailView
        course={course}
        lessons={lessons}
        resources={resources}
        previewLessons={previewLessons}
        accessibleLessonIds={accessibleLessonIds}
        resourceAccessById={resourceAccessById}
        completedLessonSet={completedLessonSet}
        completedAccessibleLessons={completedAccessibleLessons}
        progressPercent={progressPercent}
        hasPurchased={hasPurchased}
        hasValidPrice={hasValidPrice}
        purchaseCheckUnavailable={purchaseCheckUnavailable}
        isAuthenticated={Boolean(user)}
        featuredLesson={featuredLesson}
        featuredLessonVideoUrl={featuredLessonVideoUrl}
        featuredLessonVideoMessage={featuredLessonVideoMessage}
        featuredLessonVideoErrorCode={featuredLessonVideoAccess.errorCode}
        statusMessages={statusMessages}
        checkoutReturnPath={checkoutReturnPath}
      />
      <Footer />
    </div>
  );
}

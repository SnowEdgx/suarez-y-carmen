import Link from "next/link";
import CourseHero from "./CourseHero";
import CourseResourcesPanel from "./CourseResourcesPanel";
import LessonList from "./LessonList";
import SelectedLessonPanel from "./SelectedLessonPanel";
import StatusMessages from "./StatusMessages";
import type { CourseDetailViewProps } from "./course-detail.model";

export default function CourseDetailView(props: CourseDetailViewProps) {
  return (
    <main id="main-content" className="pt-28 pb-20 px-6 md:px-12 max-w-7xl mx-auto w-full flex-1">
      <Link href="/courses" className="text-sm text-neutral-400 hover:text-white transition-colors">
        Volver a cursos
      </Link>

      <StatusMessages messages={props.statusMessages} />

      <CourseHero
        course={props.course}
        hasPurchased={props.hasPurchased}
        hasValidPrice={props.hasValidPrice}
        purchaseCheckUnavailable={props.purchaseCheckUnavailable}
        isAuthenticated={props.isAuthenticated}
        checkoutReturnPath={props.checkoutReturnPath}
      />

      <section className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <SelectedLessonPanel {...props} />
        <div className="space-y-6">
          <LessonList
            course={props.course}
            lessons={props.lessons}
            hasPurchased={props.hasPurchased}
            accessibleLessonIds={props.accessibleLessonIds}
            completedLessonSet={props.completedLessonSet}
            featuredLesson={props.featuredLesson}
            isAuthenticated={props.isAuthenticated}
          />
          <CourseResourcesPanel
            resources={props.resources}
            accessByResourceId={props.resourceAccessById}
            hasPurchased={props.hasPurchased}
          />
        </div>
      </section>
    </main>
  );
}

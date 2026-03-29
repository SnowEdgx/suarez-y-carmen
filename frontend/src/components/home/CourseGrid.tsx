import { PlayCircle } from "lucide-react";

export default function CourseGrid() {
  const courses = [
    { title: "Dominando los Básicos", level: "Principiante", image: "https://images.unsplash.com/photo-1547153760-18fc86324498?q=80&w=600&auto=format&fit=crop" },
    { title: "Sensual Style Vol 1", level: "Intermedio", image: "https://images.unsplash.com/photo-1543807535-eceef0bc6599?q=80&w=600&auto=format&fit=crop" },
    { title: "Técnica de Giros", level: "Avanzado", image: "https://images.unsplash.com/photo-1508807526345-15e9b5f4eaff?q=80&w=600&auto=format&fit=crop" },
    { title: "Lady Style Esencial", level: "Multinivel", image: "https://images.unsplash.com/photo-1516997121675-4c2d1684aa3e?q=80&w=600&auto=format&fit=crop" },
  ];

  return (
    <section id="courses" className="py-24 px-6 md:px-12 bg-black/40">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold font-serif text-white mb-4">Catálogo de Cursos</h2>
            <p className="text-neutral-400 text-lg max-w-xl">Entrena de forma intensiva con programas enfocados en aspectos específicos de tu baile.</p>
          </div>
          <button className="text-white font-medium hover:text-red-500 transition-colors self-start md:self-auto">Ver todos los cursos &rarr;</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {courses.map((c, i) => (
            <div key={i} className="group relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer bg-neutral-900">
              <img 
                src={c.image} 
                alt={c.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-70 group-hover:opacity-100"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
              
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <PlayCircle className="w-16 h-16 text-white drop-shadow-2xl" />
              </div>

              <div className="absolute bottom-0 left-0 w-full p-6">
                <span className="text-xs font-bold uppercase tracking-wider text-red-500 mb-2 block">{c.level}</span>
                <h3 className="text-xl font-bold text-white leading-tight">{c.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Contenido de /quienes-somos.
 * BORRADOR / FICTICIO: misión y visión son una propuesta pendiente de aprobación; equipo, sede, año,
 * horario y varias respuestas de preguntas frecuentes son datos de ejemplo. Reemplazar antes de lanzar.
 * Los servicios sí describen funciones que ya existen en la plataforma.
 */

export const company = {
  since: 2025, // ficticio
  city: "Panabá, Yucatán", // ficticio
  address: "Calle 20 x 21, Centro, Panabá, Yucatán", // ficticio
  email: "contacto@cosave.example", // mismo dato de ejemplo que el pie de página
  phone: "+52 999 000 0000", // mismo dato de ejemplo que el pie de página
  hours: "Lunes a viernes, de 9:00 a 18:00 h", // ficticio
};

export const mission =
  "Acercar a cada persona a la propiedad que busca, incluso cuando todavía no está publicada: que encontrar casa, terreno o local en México sea claro, seguro y sin pérdida de tiempo, reuniendo en un solo lugar a compradores, propietarios y asesores.";

export const vision =
  "Ser la plataforma inmobiliaria de referencia en el sureste de México, reconocida porque nadie se queda sin la propiedad que busca: COSAVE trabaja por cada persona aunque no esté buscando.";

/** Funciones que ya existen en la plataforma. */
export const services = [
  { icon: "search", title: "Busca con filtros y mapa", text: "Filtra por ubicación, tipo, precio, recámaras y superficie, y ve dónde está cada propiedad en el mapa.", href: "/properties", cta: "Ver propiedades" },
  { icon: "bell", title: "Guarda tu búsqueda", text: "¿No hay lo que buscas? Guarda tus criterios y te avisamos en cuanto se publique una propiedad que coincida.", href: "/properties", cta: "Empezar a buscar" },
  { icon: "heart", title: "Favoritos", text: "Guarda las propiedades que te gustan y vuelve a ellas cuando quieras desde tu cuenta.", href: "/properties", cta: "Explorar" },
  { icon: "chat", title: "Contacto directo", text: "Escribe al anunciante desde la ficha de la propiedad y resuelve tus dudas directamente con quien publica.", href: "/properties", cta: "Encontrar una propiedad" },
  { icon: "home", title: "Publica tu propiedad", text: "Sube fotos y datos en minutos. Revisamos cada publicación antes de mostrarla para mantener el catálogo confiable.", href: "/vender", cta: "Publicar" },
] as const;

export const audiences = [
  { title: "Quiero comprar o rentar", text: "Busca, guarda favoritos y deja que COSAVE te avise cuando aparezca lo que necesitas.", href: "/properties", cta: "Buscar propiedades" },
  { title: "Quiero vender o rentar", text: "Publica tu propiedad y recibe mensajes de personas interesadas.", href: "/vender", cta: "Publicar propiedad" },
  { title: "Soy asesor inmobiliario", text: "Publica las propiedades que representas y recibe contactos de compradores interesados.", href: "/registro", cta: "Crear cuenta" },
] as const;

/** Equipo de ejemplo (ficticio). */
export const team = [
  { name: "Andrés Canul Pech", role: "Fundador y director general", bio: "Coordina la operación de COSAVE y la relación con propietarios y asesores." },
  { name: "Daniela Ek Sosa", role: "Producto y tecnología", bio: "Lidera el desarrollo de la plataforma y del sistema de alertas de búsquedas guardadas." },
  { name: "Luis Chan Herrera", role: "Revisión de publicaciones", bio: "Revisa que cada propiedad cumpla los requisitos antes de mostrarse en el catálogo." },
  { name: "Fernanda May Cetina", role: "Atención a usuarios", bio: "Resuelve dudas de compradores, propietarios y asesores durante todo el proceso." },
];

/** Preguntas frecuentes. Las marcadas como ficticias describen políticas aún no definidas. */
export const faqs = [
  { q: "¿Qué es COSAVE?", a: "Una plataforma inmobiliaria para buscar casas, departamentos, terrenos y otros inmuebles en venta o renta. Si hoy no encuentras lo que buscas, guardas tu búsqueda y te avisamos cuando aparezca." },
  { q: "¿Necesito una cuenta para buscar propiedades?", a: "No. Puedes buscar y ver fichas sin registrarte. La cuenta solo se necesita para guardar favoritos, guardar búsquedas, contactar a un anunciante o publicar." },
  { q: "¿Cómo funcionan las alertas de búsqueda?", a: "Guardas tus criterios (tipo, ubicación, precio…). Cada vez que se aprueba una propiedad nueva que coincide, recibes un aviso en la campana de notificaciones de tu cuenta." },
  { q: "¿Cuánto cuesta publicar una propiedad?", a: "Durante el lanzamiento, publicar en COSAVE es gratuito." }, // ficticio
  { q: "¿Por qué mi propiedad no aparece de inmediato?", a: "Cada publicación pasa por una revisión antes de mostrarse, para evitar datos incompletos o duplicados. Normalmente toma de 1 a 2 días hábiles." }, // plazo ficticio
  { q: "¿COSAVE cobra comisión por la venta o renta?", a: "No. El trato se acuerda directamente entre quien publica y la persona interesada." }, // ficticio
  { q: "Soy asesor inmobiliario, ¿puedo usar COSAVE?", a: "Sí. Crea una cuenta y publica las propiedades que representas. Pronto tendremos perfiles y directorio de asesores." },
  { q: "¿En qué zonas hay propiedades?", a: "Comenzamos en Yucatán, con propiedades en Mérida, Valladolid, Tizimín y Panabá, y crecemos conforme se suman nuevas publicaciones." }, // ficticio
];

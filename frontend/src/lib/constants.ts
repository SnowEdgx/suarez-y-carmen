/**
 * Configuración centralizada para Supabase Storage
 * Evitamos hardcodear las URLs largas por todo el proyecto
 */
const STORAGE_PROJECT_ID = 'jlpqlqvrhwdjyspwolro';
const ASSETS_BASE_URL = `https://${STORAGE_PROJECT_ID}.supabase.co/storage/v1/object/public/assets`;

export const STORAGE_ASSETS = {
  VIDEO_HERO: `${ASSETS_BASE_URL}/hero.mp4`,
  IMG_2681: `${ASSETS_BASE_URL}/IMG_2681.jpeg`,
  IMG_2872: `${ASSETS_BASE_URL}/IMG_2872.png`,
  IMG_4784: `${ASSETS_BASE_URL}/IMG_4784.jpeg`,
  IMG_4587: `${ASSETS_BASE_URL}/IMG_4587.png`,
};

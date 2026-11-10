import {defineConfig} from 'vite';
export default defineConfig({build:{rollupOptions:{output:{manualChunks(id){
 if(id.includes('node_modules')){
  if(id.includes('/gsap/'))return 'animation';
  if(id.includes('/lucide-react/'))return 'icons';
  if(/\/(react|react-dom|react-router|scheduler)\//.test(id))return 'react-vendor';
 }
}}}}});

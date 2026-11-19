import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MakanReel — Video Property Portal',
    short_name: 'MakanReel',
    description:
      'Investor-grade, mobile-first video property listing portal with live web sync and UAE DLD compliance.',
    start_url: '/en',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#F8F7F4',
    theme_color: '#12151A',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}

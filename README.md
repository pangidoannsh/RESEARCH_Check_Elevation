# Cek Elevasi (mdpl)

Aplikasi web untuk mengecek ketinggian permukaan tanah (meter di atas permukaan laut / mdpl) dari koordinat latitude–longitude, menggunakan [Open-Meteo Elevation API](https://open-meteo.com/en/docs/elevation-api).

Dibangun dengan **Svelte 5 + TypeScript + Vite + Tailwind CSS v4**, peta memakai **Leaflet** (OpenTopoMap / OpenStreetMap).

## Fitur

- Peta Leaflet layar penuh (layer Topografi / OpenStreetMap).
- Klik titik mana saja → panel menampilkan elevasi (mdpl & feet) dan koordinatnya.
- Panel juga menampilkan detail request (URL, status HTTP, waktu respons) serta **raw JSON response** dari Open-Meteo, lengkap dengan tombol salin.
- Tanpa API key, karena Open-Meteo gratis untuk penggunaan non-komersial.

## Menjalankan

```bash
npm install
npm run dev      # development server
npm run build    # build produksi ke folder dist/
npm run check    # type check
```

## Pemakaian API

```
GET https://api.open-meteo.com/v1/elevation?latitude=-6.9147&longitude=107.6098
→ { "elevation": [ 7xx.0 ] }
```

- Maksimal 100 koordinat per request (dipisah koma).
- Logika client ada di `src/lib/elevation.ts`.

## Catatan data

- Sumber: Copernicus DEM GLO-90 (resolusi ±90 m).
- Merupakan model permukaan (DSM), sehingga di area hutan atau gedung nilainya bisa ikut tinggi objek.
- Untuk akurasi lebih tinggi di Indonesia, pertimbangkan DEMNAS dari BIG (±8 m).
- Untuk penggunaan komersial diperlukan API key Open-Meteo (endpoint `customer-api.open-meteo.com`).
- Atribusi wajib: Copernicus program & Open-Meteo (sudah dicantumkan di footer aplikasi).

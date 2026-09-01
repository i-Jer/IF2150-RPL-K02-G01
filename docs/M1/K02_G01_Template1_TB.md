<h1>
IF2150 REKAYASA PERANGKAT LUNAK
<br>
TUGAS 1
<br>
TOPIC BRAINSTORMING
</h1>
<br>

## *Nama Perangkat Lunak*

### Untuk: *Aurelia Jennifer Gunawan*

Dipersiapkan oleh:
| Informasi | Keterangan |
| --- | --- |
| Kelas | *K02* |
| Kelompok | *G01*  |

| NIM | Nama |
|---|---|
| *13525104* | *Jeremy Gerald Sutanto* |
| *13525116* | *Christian Immanuel* |
| *13525014* | *Denzel Santoso* |
| *13525011* | *Raihan* |
| *13525125* | *Peter Emmanuel Suwardy* |
---

<br>
<br>

# BAB 1: Analisis Permasalahan

## 1.1 Latar Belakang Masalah
Pencemaran ekosistem laut akibat sampah, khususnya limbah plastik. telah berkembang menjadi salah satu masalah yang besar dan krusial di masa ini. Masalah ini berkaitan erat dengan Tujuan Pembangunan Berkelanjutan (SDGs) 14 yaitu Life Below Water untuk mencegah segala bentuk pencemaran laut, terutama yang bersumber dari aktivitas dari daratan

Berdasarkan publikasi dari World Bank Group (WBG, 2021), Indonesia menghasilkan sebanyak 7,8 juta ton sampah plastik memasukin lautan global setiap tahunnya. Diperkirakan rentang antara 201,1 - 552,3 kilo ton sampah plastik per tahun dibuang ke dalam ekosistem laut yang bersumber dari daratan, di mana 2/3 sampah tersebut berasal dari Jawa dan Sumatera. Data Kementerian Lingkungan Hidup dan Kehutanan (KLHK, 2022) juga menunjukkan bahwa tumpukan plastik baik makro ataupun mikroplastik di perairan Indonesia mengancam lebih dari 200 spesies laut, merusak terumbu karang, serta menimbulkan kerugian ekonomi mencapai triliunan rupiah pada sektor perikanan tangkap dan pariwisata bahari.

Urgensi penanganan masalah ini sangat tinggi karena limbah plastik tersebut terombang-ambing di laut sehingga bisa terpecah menjadi mikroplastik yang dapat membahayakan maritim laut dan manusia. Metode pemantauan tradisional secara manual terbukti tidak bisa menyelesaikan masalah sampah laut yang terus terombang-ambing ini. Oleh karena itu, diperlukan penanganan melalui software berbentuk gamifikasi untuk menarik perhatian masyarakat dari berbagai daerah di Indonesia untuk ikut berkontribusi dalam membersihkan sampah laut tersebut.

## 1.2 Analisis Kondisi Saat Ini
Lakukan analisis terhadap proses yang berjalan saat ini di dunia nyata, baik itu sistem lama ataupun solusi yang sudah ada. Soroti kesenjangan atau celah dari kondisi tersebut yang nantinya akan diselesaikan oleh perangkat lunak kalian.

---

# BAB 2: Analisis Solusi

## 2.1 Deskripsi Perangkat Lunak
Untuk mengatasi masalah itu, kelompok kami mengusulkan untuk membuat perangkat lunak bernama SeaGuard: Sistem Monitoring dan Analisis Sampah Laut. SeaGuard merupakan platform yang dapat digunakan masyarakat untuk memperoleh informasi mengenai kondisi pencemaran sampah laut di Indonesia. SeaGuard juga dapat berperan sebagai pusat informasi dan data-data terkait laporan pencemaran dan titik-titik sampah laut. Sumber datanya dapat diperoleh dari laporan relawan atau survei dari masyarakat sekitar yang dapat memasukan datanya ke dalam website untuk kemudian diverifikasi dan dianalisis lebih lanjut.

Data yang dikumpulkan akan diolah oleh sistem menjadi 2 output utama. Pertama adalah analisis dan statistik pencemaran wilayah yang dilaporkan, yang mencakup data-data seperti volume sampah dalam perairan tersebut, sumber pencemaran lingkungan, tingkat kesehatan ekosistem laut, dan tingkat kualitas air. Kedua adalah visualisasi dalam bentuk heatmap yang menunjukkan tingkat pencemaran lingkungan dalam wilayah perairan tertentu. Semakin pekat warna dalam heatmapnya, maka semakin tinggi tingkat pencemaran lingkungan di wilayah itu.

Perangkat lunak ini akan dikembangkan dalam bentuk web supaya masyarakat dapat mengakses lebih mudah. Dengan bentuk ini, informasi terkait pencemaran lingkungan laut akan lebih mudah untuk diperbarui dan laporan masyarkat dapat dikirimkan ke database sehingga dapat langsung diolah oleh sistem. Aplikasi web juga dinilai lebih sesuai karena visualisasi heatmap dan data dapat ditampilkan dengan lebih baik dalam bentuk ini. Selain itu, SeaGuard dapat diakses dari berbagai perangkat tanpa instalasi.

Nilai unik SeaGuard terdapat pada fitur leaderboard seperti gamifikasi bagi masyarakat untuk berpartisipasi dalam penanganan pencemaran lingkungan laut. Jika suatu tim relawan telah membersihkan sampah dari suatu wilayah maka tim tersebut dapat melaporkan ke website bahwa wilayah tersebut sudah dibersihkan beserta memberikan bukti-buktinya. Lalu, bukti-bukti itu akan diverifikasi lebih lanjut oleh sistem dan wilayah akan disurvei kembali untuk memastikan lagi. Setelah terverifikasi maka tim tersebut akan mendapatkan poin sesuai dengan usahanya. Kontribusi dan usaha tim itu akan dicantumkan juga ke dalam leaderboard di platform itu. Hal ini akan lebih menarik masyarkat umum untuk lebih aktif dalam berpartisipasi untuk membersihkan wilayah perairan yang tercemar.

## 2.2 Asumsi dan Batasan
Definisikan secara tegas asumsi (baik teknis maupun dari sisi pengguna) yang menjadi dasar pengembangan. Tuliskan batasan seperti regulasi/hukum, keterbatasan sumber daya, dan ruang lingkup solusi.

Asumsi Teknis:
- Relawan / Masyarakat sekitar yang melaporkan adanya pencemaran lingkungan di wilayah tertentu diasumsikan memiliki perangkat yang dapat melaporkan hal itu dan memiliki akses pada internet.
-

Asumsi Pengguna:
- 

Batasan Sumber daya:
- 

---

# BAB 3: Spesifikasi Kebutuhan dan Proses Bisnis

## 3.1 Identifikasi Aktor

| Aktor | Deskripsi |
| :--- | :--- |
| *Relawan* | *Pengguna umum (masyarakat/mahasiswa/komunitas peduli lingkungan) yang melaporkan titik sampah, memantau heatmap, mengklaim titik untuk dibersihkan, dan mengunggah bukti pembersihan. Karakteristiknya mengutamakan kemudahan pelaporan dan motivasi berupa skor/kompetisi.* |
| *Verifikator/Admin* | *Pengelola sistem (bisa dari pihak Dinas Lingkungan Hidup, koordinator komunitas, atau tim internal) yang bertugas memvalidasi kebenaran laporan sampah dan bukti pembersihan sebelum skor diberikan. Karakteristiknya mengutamakan akurasi data agar sistem tidak disalahgunakan (laporan palsu/klaim curang).* |
| *Sistem* | *Aktor otomatis untuk menghitung skor kepanasan tiap titik, memperbarui heatmap secara real-time, dan mengelola leaderboard.* |

## 3.2 Kebutuhan Pengguna Awal

| ID | Aktor | Kebutuhan / Aktivitas | Tujuan / Nilai |
| :--- | :--- | :--- | :--- |
| US-01 | *Relawan* | *Melaporkan titik sampah dengan foto dan lokasi GPS* | *Data sebaran sampah tercatat akurat dan real-time* |
| US-02 | *Relawan* | *Melihat peta heatmap sebaran sampah* | *Bisa memilih lokasi yang paling butuh dibersihkan* |
| US-03 | *Relawan* | *Mengklaim titik sampah untuk dibersihkan* | *Menghindari duplikasi usaha dengan relawan lain* |
| US-04 | *Relawan* | *Mengunggah bukti before/after pembersihan* | *Mendapatkan pengakuan dan skor atas kontribusinya* |
| US-05 | *Relawan* | *Melihat papan peringkat (leaderboard)* | *Termotivasi berkompetisi secara sehat dengan relawan lain* |
| US-06 | *Verifikator/Admin* | *Memeriksa validitas laporan titik sampah* | *Mencegah data palsu/spam mengotori heatmap* |
| US-07 | *Verifikator/Admin* | *Memvalidasi bukti pembersihan yang diunggah* | *Memastikan skor hanya diberikan untuk pembersihan nyata* |
| US-08 | *Verifikator/Admin* | *Mengelola data pengguna dan komunitas* | *Menjaga kualitas dan keamanan platform* |

## 3.3 Deskripsi Aktivitas
| ID | Aktivitas | Penjelasan | ID User Story |
| :--- | :--- | :--- | :--- |
| A01 | *Melaporkan Titik Sampah* | *Relawan mengunggah foto dan lokasi titik sampah ke sistem* | *US-01* |
| A02 | *Menghitung Skor Kepanasan* | *Sistem menghitung tingkat urgensi tiap titik berdasarkan jumlah laporan dan lama belum ditangani, lalu memperbarui heatmap* | *US-02* |
| A03 | *Memeriksa Validitas Laporan* | *Verifikator meninjau laporan masuk untuk memastikan bukan spam/data palsu* | *US-06* |
| A04 | *Mengklaim Titik untuk Dibersihkan* | *Relawan memilih dan mengunci satu titik di peta sebagai target pembersihannya* | *US-03* |
| A05 | *Mengunggah Bukti Pembersihan* | *Relawan mengunggah foto sebelum dan sesudah sebagai bukti aksi bersih-bersih* | *US-04* |
| A06 | *Memvalidasi Bukti Pembersihan* | *Verifikator memeriksa kesesuaian bukti dengan titik yang diklaim* | *US-07* |
| A07 | *Memberi Skor & Update Leaderboard* | *Sistem memberikan skor sesuai tingkat kepanasan titik yang berhasil dibersihkan, lalu memperbarui papan peringkat* | *US-04, US-05* |
| A08 | *Mengelola Data Pengguna/Komunitas* | *Admin mengatur akun, hak akses, dan data komunitas dalam sistem* | *US-08* |

## 3.4 Model Proses Bisnis
Buatlah *Activity Diagram* atau *Swimlane Diagram* yang menunjukkan alur kerja proses bisnis dari sistem solusi. Diagram ini harus memvisualisasikan bagaimana alur operasional di dunia nyata berjalan lebih efisien dengan adanya interaksi antara aktor (yang didefinisikan pada poin 3.1) dan sistem perangkat lunak. Perhatikan notasi yang digunakan dalam pembuatannya.
<br>

<p align="center">
<img alt="Contoh Activity Diagram" src="./assets/diagram/diagram-act-1.avif" width="70%">
</p>
<p align="center">
<i>Gambar 1. Contoh Activity Diagram</i>
</p>

<br>

# Referensi
- Diagram UML: https://www.drawio.com/, https://staruml.io/

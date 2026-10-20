<h1>
IF2150 REKAYASA PERANGKAT LUNAK
<br>
TUGAS 7
<br>
DESKRIPSI PERANCANGAN PERANGKAT LUNAK (DPPL)
</h1>
<br>

## *SeaGuard*
### *[Logo Perangkat Lunak]*
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

## Daftar Perubahan

| Revisi | Deskripsi |
| :--- | :--- |
| *A* | *Deskripsikan perubahan yang dilakukan dari dokumen sebelumnya pada dokumen ini. Jika tidak terdapat perubahan, harap kosongkan tabel.* |
| *B* |  |
| *C* |  |
| ... |  |

---

<br>

> **Petunjuk pengerjaan:** *[Silahkan hapus bagian ini setelah selesai mengerjakan]*
>
> Dokumen ini melanjutkan **Spesifikasi Kebutuhan Perangkat Lunak (SKPL)** dan **Arsitektur Perangkat Lunak (APL)**. Gunakan nama, ID, kebutuhan, dan use case yang konsisten dengan kedua dokumen tersebut. Contoh pola ID baru di bawah dapat disesuaikan dengan kesepakatan kelompok, ID yang sudah ada tetap dipertahankan.

<br>

---


# BAB 1: Pendahuluan

## 1.1 Tujuan Penulisan Dokumen
Dokumen Spesifikasi Kebutuhan Perangkat Lunak (SKPL) merupakan dokumen yang bertujuan sebagai acuan atau panduan untuk pengembang dan pengguna perangkat lunak selama dalam pengembangan perangkat lunak yang akan dibangun. Dokumen SKPL ini berisi spesifikasi kebutuhan dari perangkat lunak bernama SeaGuard yang akan dikembangkan. Perangkat lunak SeaGuard merupakan aplikasi berbasis web bagi Relawan untuk memantau dan melaporkan kondisi pencemaran di wilayah-wilayah perairan Indonesia.

## 1.2 Lingkup Masalah
SeaGuard merupakan perangkat lunak berbasis web yang digunakan untuk memantau dan memberikan data mengenai kondisi sampah laut di suatu wilayah di Indonesia. Berdasarkan publikasi dari World Bank Group (WBG, 2021), Indonesia menghasilkan sekitar 7,8 juta ton sampah plastik per tahun, dan diperkirakan 201,1 sampai 552,3 kiloton di antaranya masuk ke ekosistem laut, di mana dua pertiganya berasal dari Jawa dan Sumatera. Limbah plastik ini membahayakan ekosistem laut dan manusia, sehingga diperlukan penanganan melalui perangkat lunak berbentuk gamifikasi untuk mengajak masyarakat dari berbagai daerah ikut berkontribusi membersihkan sampah laut.

## 1.3 Definisi, Istilah, dan Singkatan

Tabel 1.3. Definisi Istilah dan Singkatan

| Singkatan, Akronim, atau Istilah | Penjelasan |
| :--- | :--- |
| *P/L* | *Singkatan dari Perangkat Lunak, yaitu aplikasi yang memberikan perintah kepada komputer untuk menjalankan tugas tertentu.* |
| *SKPL* | *Singkatan dari Spesifikasi Kebutuhan Perangkat Lunak, yaitu dokumen yang merangkum kriteria-kriteria yang diperlukan untuk membangun aplikasi menjalankan tugasnya.* |
| *KF* | *Singkatan dari Kebutuhan Fungsional.* |
| *KNF* | *Singkatan dari Kebutuhan Non-Fungsional.* |
| *UC* | *Singkatan dari Use Case.* |
| *EARS* | *Easy Approach to Requirements Syntax, yaitu pola penulisan kebutuhan agar konsisten dan mudah diuji.* |

## 1.4 Aturan Penomoran

Tabel 1.4. Aturan Penomoran

| Hal/Bagian | Penomoran | Keterangan |
| :--- | :--- | :--- |
| *Kebutuhan* | *RXX* | Diawali "R" diikuti dengan dua digit yang terurut dari R01 hingga R25. Satu ID kebutuhan dapat dipakai oleh lebih dari satu KF atau KNF. |
| *Kebutuhan Fungsional* | *KFXX* | Diawali "KF" diikuti dengan dua digit yang terurut dari KF01 hingga KF21. Setiap KF terhubung dengan satu ID kebutuhan. |
| *Kebutuhan Non-Fungsional* | *KNFXX* | Diawali "KNF" diikuti dengan dua digit yang terurut dari KNF01 hingga KNF12. Setiap KNF terhubung dengan satu ID kebutuhan dan satu parameter. |
| *Aktor* | *AXX* | Diawali "A" diikuti dengan dua digit yang terurut dari A01 hingga A02. |
| *Use Case* | *UCXX* | Diawali "UC" diikuti dengan dua digit yang terurut dari UC01 hingga UC08. Setiap UC terhubung dengan KF yang berkaitan. |
| *Kelas* | *CXX* | Diawali "C" diikuti dengan dua digit yang terurut dari C01 hingga C10. Setiap kelas terhubung dengan UC yang berkaitan. |

## 1.5 Referensi
Dokumentasi yang dirujuk dalam penyusunan dokumen SKPL ini meliputi:
1. Sommerville, I. (2015). *Software Engineering* (10th ed.). Pearson.
2. Laboratorium Rekayasa Perangkat Lunak. (2026). *Asistensi Akbar Tugas 4: Class Diagram*. IF2150 Rekayasa Perangkat Lunak.

## 1.6 Deskripsi Umum Dokumen (Ikhtisar)
Sistematika Dokumen SKPL ini disusun sebagai berikut:
- **BAB 1: Pendahuluan** - Membahas latar belakang, tujuan penulisan dokumen, lingkup masalah, definisi istilah/singkatan, aturan penomoran, referensi, serta sistematika penulisan dokumen SKPL.

- **BAB 2: Deskripsi Perangkat Lunak** - Membahas deskripsi umum mengenai sistem dan perangkat lunak beserta lingkup interaksinya, karakteristik pengguna (aktor) dan kebutuhan pengguna, batasan perangkat lunak, serta spesifikasi lingkungan operasi tempat perangkat lunak dijalankan.

- **BAB 3: Deskripsi Kebutuhan Perangkat Lunak** - Membahas mengenai Kebutuhan Fungsional (KF) dan Kebutuhan Non Fungsional (KNF) yang ditulis sesuai format EARS.

- **BAB 4: Pemodelan Use Case** - Membahas mengenai pemodelan use case yang berisi identifikasi aktor dan use case, diagram use case, dan skenario setiap use case.

- **BAB 5: Pemodelan Kelas** - Membahas mengenai identifikasi kelas beserta dengan diagram kelas setiap use case.

- **BAB 6: Traceability** - Membahas traceability penghubung kelas, use case, dan kebutuhan fungsional.

<br>

---

# BAB 2: Perancangan Arsitektur

## 2.1 Rancangan Lingkungan Implementasi

Sebutkan *operating system*, DBMS, *development tools*, *filing system*, dan bahasa pemrograman yang digunakan.

## 2.2 Style/Pattern Arsitektur Acuan

### Style/Pattern yang Dipilih

SeaGuard menggunakan pola MVC (Model-View-Controller) yang diterapkan di atas arsitektur client-server berbasis web. Peran setiap bagiannya adalah sebagai berikut.

1. **Model** mereprsentasikan data SeaGuard beserta operasi yang melekat pada data tersebut. Setiap model berasal dari kelas pada diagram kelas SKPL (C01 sampai C10), misalnya *LaporanPencemaran*, *KlaimTitikPencemaran*, dan *AkunRelawan*. *Model* bertugas menyimpan dan mengambil data dari basis data serta menjalankan operasi milik kelasnya, misalnya validasiFormatUkuran() pada *BuktiLaporan* dan validasiGeofencingRadius() pada *BuktiPembersihan*.
2. **View** adalah halaman antarmuka yang dilihat pengguna melalui web browser, seperti form pelaporan, peta heatmap, dashboard verifikasi, dan leaderboard. *View* hanya menampilkan data dan meneruskan aksi pengguna ke *Controller*. *View* tidak mengakses *Model* secara langsung.
3. **Controller** menerima permintaan dari *View*, menjalankan alur proses setiap use case (misalnya klaim titik pencemaran atau verifikasi laporan), memanggil *Model* yang dibutuhkan, lalu mengembalikan hasilnya ke *View*.

### Alasan Pemilihan

Pola MVC dipilih berdasarkan karakteristik SeaGuard berikut.

1. **Jenis pengguna.** SeaGuard memiliki dua ator, yaitu Relawan dan Verifikator/Admin, yang memakai data yang sama tetapi dengan tampilan berbeda. Dengan MVC, satu *Model* dapat dipakai oleh beberapa *View*. Contohnya, data *LaporanPencemaran* ditampilkan pada *HeatmapView* untuk Relawan dan pada *DashboardVerifikasiView* untuk Verifikator.
2. **Alur proses bisnis.** Alur SeaGuard berupa rangkaian perubahan status, yaitu laporan masuk, laporan diverifikasi, titik diklaim, hasil pembersihan dilaporkan, hasil pembersihan diverifikasi, lalu skor diberikan, sebagaimana digambarkan pada activity diagram SKPL (Gambar 1 SKPL). Aturan perubahan status ini ditempatkan pada *Controller* dan *Model* sehingga tidak tersebar di halaman antarmuka.
3. **Kebutuhan fungsional.** KF pada SKPL terbagi menjadi kebutuhan tampilan (misalnya KF01, KF06, KF09, KF15, dan KF18), kebutuhan permosesan (misalnya KF03, KF08, KF12, KF14, dan KF19), dan kebutuhan penyimpanan data (misalnya KF17 dan KF21). Pembagian ini sesuai dengan pemisahan *View*, *Controller*, dan *Model*.
4. **Kebutuhan non-fungsional.** Beberapa KNF lebih mudah dijamin apabila logika dipisahkan dari tampilan. Mekanisme *locking* klaim (KNF05), validasi *geofencing* (KNF06), dan log audit yang *immutable* (KNF07) dijalankan oleh *Controller* dan *Model* di sisi server sehingga tidak bergantung pada *View* di browser pengguna.

<p align="center">
<img alt="Pattern MVC pada SeaGuard" src="./assets/diagram/pattern-mvc-seaguard.png" width="70%">
</p>
<p align="center">
<i>Gambar 1. Aritektur MVC pada SeaGuard</i>
</p>

### 2.3 Identifikasi Komponen / Modul / Subsistem

Komponen SeaGuard dikelompokkan berdasarkan lapisan MVC, ditambah komponen *Pendukung*, *Integrasi Eksternal*, dan *Penyimpanan Data*.

Tabel 2.3. Identifikasi Komponen/Modul/Subsistem

| Nama Komponen/Modul/Subsistem | Jenis                 | Penjelasan                                                                                                           |
| :---------------------------- | :-------------------- | :------------------------------------------------------------------------------------------------------------------- |
| *HeatmapView* | *View* | *Menampilkan peta heatmap persebaran pencemaran beserta kategori (sehat, waspada, berbahaya), filter, pencarian lokasi, dan detail titik pencemaram (UC02). Halaman ini juga menyediakan tombol klaim titik pencemaran (UC04).* |
| *PembersihanView* | *View* | *Menampilkan form laporan pembersihan berisi foto sebelum, foto sesudah, dan deskripsi kegiatan (UC05).* |
| *PelaporanView* | *View* | *Menampilkan form laporan pencemaran berisi unggah foto, indikator tingkat pencemaran, dan koordinat lokasi, beserta dialog persetujuan akses lokasi dan kamera (UC01).* |
| *DashboardVerifikasiView* | *View* | *Menampilkan antrean laporan pencemaran dan daftar pengajuan pembersihan, detail laporan, perbandingan foto before-after, serta tombol setujui/tolak bagi Verifikator (UC03, UC06).* |
| *LeaderboardView* | *View* | *Menampilkan papan peringkat beserta total poin kontribusi Relawan (UC07).* |
| *PanelAdminView* | *View* | *Menampilkan daftar akun, komunitas, dan hak akses beserta form perubahan data bagi Admin (UC08).* |
| *HeatmapController* | *Controller* | *Mengambil laporan terverifikasi, menghitung heat intensity tiap klaster titik, serta memproses filter kategori dan pencarian lokasi.* |
| *KlaimController* | *Controller* | *Memproses klaim titik pencemaran dengan mekanisme locking agar satu titik hanya dapat diklaim oleh satu Relawan.* |
| *PembersihanController* | *Controller* | *Memproses laporan pembersihan, yaitu memvalidasi geofencing foto terhadap titik klaim, mengunggaj foto melalui StorageAdapter, lalu mengubah status klaim menjadi "Menunggu Verifikasi".* |
| *PelaporanController* | *Controller* | *Memproses laporan pencemaran baru, yaitu memvalidasi format dan ukuran foto, mengekstrak metadata EXIF, mengunggah foto melalui StorageAdapter, lalu menimpan laporan.* |
| *VerifikasiController* | *Controller* | *Memproses keputusan Verifikator atas laporan pencemaran dan laporan pembersihan, mencatat log audit, menambah poin Relawan dan memperbarui leaderboard ketika pembersihan disetujui, serta meminta Notifikasi mengirim pemberitahuan ke Relawan.* |
| *LeaderboardController* | *Controller* | *Mengambil daftar peringkat dan posisi Relawan untuk ditampilkan pada LeaderboardView.* |
| *AdminController* | *Controller* | *Memproses perubahan peran, penangguhan akun, dan pembaruan data komunitas.* |
| *PetaHeatmap* | *Model* | *Merepresentasikan klaster titik pencemaran beserta heat intensity dan kategori kualitas perairannya (C10).* |
| *KlaimTitikPencemaran* | *Model* | *Merepresentasikan data klaim titik pencemaran oleh Relawan serta metode untuk mengkunci dan membatalkam klaim (C03).* |
| *BuktiLaporan* | *Model* | *Merepresentasikan foto bukti laporan pencemaran beserta metadata EXIF serta metode untuk memvalidasi format dan ukuran berkas (C02).* |
| *LaporanPencemaran* | *Model* | *Merepresentasikan data laporan pencemaran (koordinat, indikator tingkat, dan status) serta metode untuk membuat, mengambil, dan mengubah status laporan (C01).* |
| *BuktiPembersihan* | *Model* | *Merepresentasikan foto before-after beserta koordinat GPS-nya serta metode untuk memvalidasi radius geofencing (C05).* |
| *LaporanPembersihan* | *Model* | *Merepresentasikan data laporan hasil pembersihan beserta status verifikasinya (C04).* |
| *LogVerifikasi* | *Model* | *Merepresentasikan catatan audit setiap tindakan verifikasi, yaitu ID Verifikator, keputusan, dan stempel waktu (C06).* |
| *AkunRelawan* | *Model* | *Merepresentasikan data akun pengguna (profil, peran, status akun, dan total poin) serta metode untuk mengakses dan mengubahnya (C08).* |
| *Leaderboard* | *Model* | *Merepresentasikan urutan peringkat Relawan serta metode untuk menghitung ulang peringkat (C07).* |
| *Komunitas* | *Model* | *Merepresentasikan data komunitas yang dikelola oleh Admin (C09).* |
| *Notifikasi* | *Pendukung* | *Mengirim notifikasi in-app secara real-time kepada Relawan ketika status laporan atau pembersihannya diperbarui oleh Verifikator.* |
| *Autentikasi* | *Pendukung* | *Memeriksa sesi login dan peran pengguna (Relawan atau Verifikator/Admin) sebelum controller memproses permintaan, termasuk mengunci akun sementara setelah 5 kali gagal login (KNF09).* |
| *StorageAdapter* | *Integrasi Eksternal* | *Mengunggah berkas foto bukti ke layanan Cloud Object Storage dan mengembalikan URL foto untuk disimpan pada Model.* |
| *Database* | *Penyimpanan Data* | *Menyimpan seluruh data Model secara persisten pada PostgreSQL dengan ekstensi PostGIS.* |

Keterangan:
1. Seluruh kelas pada diagram kelas SKPL (C01 sampai C10) tercakup sebagai komponen *Model* dengan nama yang sama.
2. Seluruh use case dapar dijalankan oleh pasangan *View* dan *Controller* berikut: UC01 oleh *PelaporanView* dan *PelaporanController*, UC02 oleh *HeatmapView* dan *HeatmapController*, UC03 dan UC06 oleh *DashboardVerifikasiView* dan *VerifikasiController*, UC04 oleh *HeatmapView* dan *KlaimController*, UC05 oleh *PembersihanView* dan *PembersihanController*, UC07 oleh *LeaderboardView* dan *LeaderboardController*, serta UC08 oleh *PanelAdminView* dan *AdminController*.
3. Sistem di luar P/L yang disebutkan pada subbab 2.2 SKPL, yaitu Geolocation API pada browser, layanan peta pihak ketiga, dan Cloud Object Storage, tidak dimasukkan ke tabel ini. Geolocation API dan layanan peta dipakai langsung oleh *View* di browser, sedangkan Cloud Object Storage diakses dari server melalui *StorageAdapter*.

## 2.4 Model Arsitektur Perangkat Lunak

### 2.4 Logical View

*Logical View* dipilih karena *view* ini dapat memperlihatkan seluruh komponen pada Tabel 2.1 beserta hubungan antarkomponennya dalam pembagian *View*, *Controller*, dan *Model*. Dengan *view* ini, alur setiap use case dapat ditelusuri mulai dari halaman yang dibuka pengguna sampai data yang disimpan. Lingkungan fisik SeaGuard (server, browser, basis data, dan penyimpanan berkas) sudah dijelaskan pada Tabel 1.1, sehingga kelompok cukup membuat satu *view*.

<p align="center">
<img alt="Logical View SeaGuard" src="./assets/diagram/logical-view-seaguard.png" width="100%">
</p>
<p align="center">
<i>Gambar 2. Logical View SeaGuard</i>
</p>

Gambar 2 menggambarkan seluruh komponen pada Tabel 2.1 yang dikelompokkan sesuai pola MVC, ditambah komponen *Pendukung*, *Integrasi Eksternal*, dan *Database*. Sistem di luar P/L, yaitu Layanan Peta Pihak Ketiga, Geolocation API (browser), dan Cloud Object Storage, digambarkan dengan garis putus-putus. Arti setiap label garis adalah sebagai berikut.

1. **Memanggil**: *View* memanggil *Controller* ketika pengguna melakukan aksi pada halaman.
2. **akses**: *Controller* mengakses *Model* yang dibutuhkan use case. *BuktiLaporan* dan *BuktiPembersihan* diakses melalui *Model* induknya, yaitu *LaporanPencemaran* dan *LaporanPembersihan*.
3. **komposisi** dan **agregasi**: hubungan antar-*Model* yang mengikuti diagram kelas keseluruhan pada SKPL (Gambar 11 SKPL).
4. **menyimpan data**: seluruh *Model* menyimpan data ke *Database*.
5. **cek sesi dan peran** dan **akses data akun**: setiap *Controller* memeriksa sesi dan peran pengguna melalui *Autentikasi*, yang membaca data dari *AkunRelawan*.
6. **kirim notifikasi** dan **notifikasi in-app ke Relawan**: *VerifikasiController* meminta *Notifikasi* mengirim pemberitahuan ke halaman Relawan setelah verifikasi.
7. **unggah foto bukti** dan **simpan berkas foto**: *PelaporanController* dan *PembersihanController* mengunggah foto melalui *StorageAdapter* ke Cloud Object Storage.
8. **memuat peta dasar** dan **ambil koordinat GPS**: *HeatmapView* memuat peta dasar dari layanan peta pihak ketiga, sedangkan *PelaporanView* dan *PembersihanView* mengambil koordinat GPS dari Geolocation API pada browser.


### 2.4.1 View [Nama View]

Tuliskan secara singkat model arsitektur yang dipilih dan alasan model tersebut cocok untuk aplikasi.

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/contoh-logical-view.webp" width="50%">
</p>
<p align="center">
<i>Gambar 2. Contoh Logical View pada P/L E-Commerce</i>
</p>

### 2.4.X View [Nama View]
*[Lakukan hal yang sama dengan bagian sebelumnya]*

<br>

---


# BAB 3: Realisasi Use Case

## 3.1 Use Case Melaporkan Titik Pencemaran

**ID Use Case:** *UC01*  
**Nama Use Case:** *Melaporkan Titik Pencemaran*

### 3.1.1 Identifikasi Kelas

Identifikasi kelas yang terkait dengan use case tersebut. Kelas di tahap perancangan dapat berbeda dengan dengan kelas di tahap analisis. Dapat menggunakan tabel di bawah:

Tabel 3.1. Identifikasi Kelas Use Case UC01

| No | Nama Kelas Perancangan | Nama Kelas Analisis Terkait |
|:--- | :--- | :--- |
| 1 | *PelaporanView (C11)* | *-* |
| 2 | *PelaporanController (C17)* | *-* |
| 3 | *LaporanPencemaran (C01)* | *LaporanPencemaran (C01)* |
| 4 | *BuktiLaporan (C02)* | *BuktiLaporan (C02)* |
| 5 | *AkunRelawan (C08)* | *AkunRelawan (C08)* |
| 6 | *Autentikasi (C25)* | *-* |
| 7 | *StorageAdapter (C26)* | *-* |

### 3.1.2 Sequence Diagram

Buat *sequence diagram* untuk **setiap skenario use case**, mencakup skenario normal dan alternatif pada subbab 4.4 SKPL. Diagram melibatkan kelas-kelas yang telah diidentifikasi pada SKPL. 

- **Skenario Normal**

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/contoh-sequence_diagram.png" width="50%">
</p>
<p align="center">
<i>Gambar X. Sequence Diagram [UC01]</i>
</p>

- **Skenario Alternatif [Nomor]: [Nama Skenario]**

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/contoh-sequence_diagram.png" width="50%">
</p>
<p align="center">
<i>Gambar X. Sequence Diagram [UC01] - [Nama skenario alternatif]</i>
</p>

### 3.1.3 Diagram Kelas

Buatlah diagram kelas untuk use case ini yang terdiri atas kelas-kelas dari 3.1.1. **Setiap kelas pada diagram wajib menampilkan atribut dan metode/operasi langsung di dalam kotak kelasnya**, sehingga tidak perlu membuat tabel daftar atribut dan metode per kelas pada subbab ini. Daftar lengkap atribut dan metode seluruh kelas disajikan pada Tabel 4.1 (Bab 4).

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/contoh_class-diagram2.jpg" width="35%">
</p>
<p align="center">
<i>Gambar X. Diagram Kelas [Nama Uce Case]</i>
</p>

Pada diagram, pastikan:
- Atribut dituliskan beserta visibilitas dan tipe datanya, misalnya `- email: String`.
- Operasi dituliskan beserta visibilitas, parameter, dan tipe kembaliannya, misalnya `+ login(email: String, password: String): Boolean`.
- Relasi antarkelas (asosiasi, agregasi, komposisi, generalisasi, dan dependensi) digambarkan lengkap dengan multiplisitas.
- Semua operasi yang dipanggil pada sequence diagram 3.1.2 (skenario normal dan alternatif) ada pada kelas yang bersangkutan.
- Kelas yang sama dengan kelas di use case lain memakai nama, atribut, dan metode yang konsisten.

## 3.2 Use Case Melihat Data dan Heatmap Pencemaran

**ID Use Case:** *UC02*  
**Nama Use Case:** *Melihat Data dan Heatmap Pencemaran*

### 3.2.1 Identifikasi Kelas

Tabel 3.2. Identifikasi Kelas Use Case UC02

| No | Nama Kelas Perancangan | Nama Kelas Analisis Terkait |
|:--- | :--- | :--- |
| 1 | *HeatmapView (C12)* | *-* |
| 2 | *HeatmapController (C18)* | *-* |
| 3 | *LaporanPencemaran (C01)* | *LaporanPencemaran (C01)* |
| 4 | *PetaHeatmap (C10)* | *PetaHeatmap (C10)* |
| 5 | *Autentikasi (C25)* | *-* |

### 3.2.2 Sequence Diagram

- **Skenario Normal**

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/UC02_normal.jpg" width="50%">
</p>
<p align="center">
<i>Gambar X. Sequence Diagram [UC02]</i>
</p>

- **Skenario Alternatif [Nomor]: [Nama Skenario]**

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/contoh-sequence_diagram.png" width="50%">
</p>
<p align="center">
<i>Gambar X. Sequence Diagram [UC02] - Lokasi Tidak Ditemukan</i>
</p>

### 3.2.3 Diagram Kelas

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/contoh_class-diagram2.jpg" width="35%">
</p>
<p align="center">
<i>Gambar X. Diagram Kelas [UC02]</i>
</p>

## 3.3 Use Case Memverifikasi Laporan Pencemaran

**ID Use Case:** *UC03*  
**Nama Use Case:** *Memverifikasi Laporan Pencemaran*

### 3.3.1 Identifikasi Kelas

Tabel 3.3. Identifikasi Kelas Use Case UC03

| No | Nama Kelas Perancangan | Nama Kelas Analisis Terkait |
|:--- | :--- | :--- |
| 1 | *DashboardVerifikasiView (C13)* | *-* |
| 2 | *VerifikasiController (C19)* | *-* |
| 3 | *LaporanPencemaran (C01)* | *LaporanPencemaran (C01)* |
| 4 | *BuktiLaporan (C02)* | *BuktiLaporan (C02)* |
| 5 | *LogVerifikasi (C06)* | *LogVerifikasi (C06)* |
| 6 | *AkunRelawan (C08)* | *AkunRelawan (C08)* |
| 7 | *Notifikasi (C24)* | *-* |
| 8 | *Autentikasi (C25)* | *-* |

### 3.3.2 Sequence Diagram

- **Skenario Normal**

> *(Diagram blm selesai)*

- **Skenario Alternatif [Nomor]: [Nama Skenario]**

> *(Diagram blm selesai)*

### 3.3.3 Diagram Kelas

> *(Diagram blm selesai)*

## 3.4 Use Case Mengklaim Titik Pencemaran

**ID Use Case:** *UC04*  
**Nama Use Case:** *Mengklaim Titik Pencemaran*

### 3.4.1 Identifikasi Kelas

Tabel 3.4. Identifikasi Kelas Use Case UC04

| No | Nama Kelas Perancangan | Nama Kelas Analisis Terkait |
|:--- | :--- | :--- |
| 1 | *HeatmapView (C12)* | *-* |
| 2 | *KlaimController (C20)* | *-* |
| 3 | *LaporanPencemaran (C01)* | *LaporanPencemaran (C01)* |
| 4 | *KlaimTitikPencemaran (C03)* | *KlaimTitikPencemaran (C03)* |
| 5 | *AkunRelawan (C08)* | *AkunRelawan (C08)* |
| 6 | *Autentikasi (C25)* | *-* |

### 3.4.2 Sequence Diagram

- **Skenario Normal**

> *(Diagram blm selesai)*

- **Skenario Alternatif [Nomor]: [Nama Skenario]**

> *(Diagram blm selesai)*

### 3.4.3 Diagram Kelas

> *(Diagram blm selesai)*

## 3.5 Use Case Melaporkan Hasil Pembersihan

**ID Use Case:** *UC05*  
**Nama Use Case:** *Melaporkan Hasil Pembersihan*

### 3.5.1 Identifikasi Kelas

Tabel 3.5. Identifikasi Kelas Use Case UC05

| No | Nama Kelas Perancangan | Nama Kelas Analisis Terkait |
|:--- | :--- | :--- |
| 1 | *PembersihanView (C14)* | *-* |
| 2 | *PembersihanController (C21)* | *-* |
| 3 | *KlaimTitikPencemaran (C03)* | *KlaimTitikPencemaran (C03)* |
| 4 | *LaporanPembersihan (C04)* | *LaporanPembersihan (C04)* |
| 5 | *BuktiPembersihan (C05)* | *BuktiPembersihan (C05)* |
| 6 | *AkunRelawan (C08)* | *AkunRelawan (C08)* |
| 7 | *Autentikasi (C25)* | *-* |
| 8 | *StorageAdapter (C26)* | *-* |

### 3.5.2 Sequence Diagram

- **Skenario Normal**

> *(Diagram blm selesai)*

- **Skenario Alternatif [Nomor]: [Nama Skenario]**

> *(Diagram blm selesai)*

### 3.5.3 Diagram Kelas

> *(Diagram blm selesai)*

## 3.6 Use Case Memverifikasi Hasil Pembersihan

**ID Use Case:** *UC06*  
**Nama Use Case:** *Memverifikasi Hasil Pembersihan*

### 3.6.1 Identifikasi Kelas

Tabel 3.6. Identifikasi Kelas Use Case UC06

| No | Nama Kelas Perancangan | Nama Kelas Analisis Terkait |
|:--- | :--- | :--- |
| 1 | *DashboardVerifikasiView (C13)* | *-* |
| 2 | *VerifikasiController (C19)* | *-* |
| 3 | *LaporanPembersihan (C04)* | *LaporanPembersihan (C04)* |
| 4 | *BuktiPembersihan (C05)* | *BuktiPembersihan (C05)* |
| 5 | *LogVerifikasi (C06)* | *LogVerifikasi (C06)* |
| 6 | *Leaderboard (C07)* | *Leaderboard (C07)* |
| 7 | *AkunRelawan (C08)* | *AkunRelawan (C08)* |
| 8 | *Notifikasi (C24)* | *-* |
| 9 | *Autentikasi (C25)* | *-* |

### 3.6.2 Sequence Diagram

- **Skenario Normal**

> *(Diagram blm selesai)*

- **Skenario Alternatif [Nomor]: [Nama Skenario]**

> *(Diagram blm selesai)*

### 3.6.3 Diagram Kelas

> *(Diagram blm selesai)*

## 3.7 Use Case Melihat Leaderboard*

**ID Use Case:** *UC07*  
**Nama Use Case:** *Melihat Leaderboard*

### 3.7.1 Identifikasi Kelas

Tabel 3.7. Identifikasi Kelas Use Case UC07

| No | Nama Kelas Perancangan | Nama Kelas Analisis Terkait |
|:--- | :--- | :--- |
| 1 | *LeaderboardView (C15)* | *-* |
| 2 | *LeaderboardController (C22)* | *-* |
| 3 | *Leaderboard (C07)* | *Leaderboard (C07)* |
| 4 | *AkunRelawan (C08)* | *AkunRelawan (C08)* |
| 5 | *Autentikasi (C25)* | *-* |

### 3.7.2 Sequence Diagram

- **Skenario Normal**

> *(Diagram blm selesai)*

- **Skenario Alternatif [Nomor]: [Nama Skenario]**

> *(Diagram blm selesai)*

### 3.7.3 Diagram Kelas

> *(Diagram blm selesai)*

## 3.8 Use Case Mengelola Akun Relawan dan Data Komunitas

**ID Use Case:** *UC08*  
**Nama Use Case:** *Mengelola Akun Relawan dan Data Komunitas*

### 3.8.1 Identifikasi Kelas

Tabel 3.8. Identifikasi Kelas Use Case UC08

| No | Nama Kelas Perancangan | Nama Kelas Analisis Terkait |
|:--- | :--- | :--- |
| 1 | *PanelAdminView (C16)* | *-* |
| 2 | *AdminController (C23)* | *-* |
| 3 | *AkunRelawan (C08)* | *AkunRelawan (C08)* |
| 4 | *Komunitas (C09)* | *Komunitas (C09)* |
| 5 | *Autentikasi (C25)* | *-* |

### 3.8.2 Sequence Diagram

- **Skenario Normal**

> *(Diagram blm selesai)*

- **Skenario Alternatif [Nomor]: [Nama Skenario]**

> *(Diagram blm selesai)*

### 3.8.3 Diagram Kelas

> *(Diagram blm selesai)*

<br>

---

# BAB 4: Diagram Kelas Keseluruhan

## 4.1 Diagram Kelas

**Bagian ini diisi dengan diagram kelas keseluruhan.**

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/contoh-class_diargam.png" width="35%">
</p>
<p align="center">
<i>Gambar 4.1. Diagram Kelas Perancangan Keseluruhan [Nama P/L]</i>
</p>

Tabel 4.1. Daftar Kelas Perancangan Keseluruhan

| ID Kelas | Nama Kelas | Atribut | Metode/Operasi |
| :--- | :--- | :--- | :--- |
| *[C01]* | *[Nama kelas]* | *[Daftar atribut]* | *[Daftar metode/operasi]* |
| *[C02]* | *[Nama kelas]* | *[Daftar atribut]* | *[Daftar metode/operasi]* |
| *[C03]* | *[Nama kelas]* | *[Daftar atribut]* | *[Daftar metode/operasi]* |
| *...* | *...* | *...* | *...* |

<br>

---

# BAB 5: Matriks Kerunutan

Petakan kelas perancangan dengan use case yang terkait. Gunakan **BAB 6 Traceability pada dokumen SKPL** sebagai acuan keterkaitan kelas analisis dan use case, lalu sesuaikan dengan realisasi use case dan kelas perancangan pada BAB 3–BAB 5 DPPL.

Tabel 5.1. Matriks Kerunutan Kelas terhadap Use Case

| Kelas | Use Case Terkait |
| :--- | :--- |
| *C01 - LaporanPencemaran* | *UC01 - Melaporkan Titik Pencemaran*<br>*UC02 - Melihat Data dan Heatmap Pencemaran*<br>*UC03 - Memverifikasi Laporan Pencemaran*<br>*UC04 - Mengklaim Titik Pencemaran* |
| *C02 - BuktiLaporan* | *UC01 - Melaporkan Titik Pencemaran*<br>*UC03 - Memverifikasi Laporan Pencemaran* |
| *C03 - KlaimTitikPencemaran* | *UC04 - Mengklaim Titik Pencemaran*<br>*UC05 - Melaporkan Hasil Pembersihan* |
| *C04 - LaporanPembersihan* | *UC05 - Melaporkan Hasil Pembersihan*<br>*UC06 - Memverifikasi Hasil Pembersihan* |
| *C05 - BuktiPembersihan* | *UC05 - Melaporkan Hasil Pembersihan*<br>*UC06 - Memverifikasi Hasil Pembersihan* |
| *C06 - LogVerifikasi* | *UC03 - Memverifikasi Laporan Pencemaran*<br>*UC06 - Memverifikasi Hasil Pembersihan* |
| *C07 - Leaderboard* | *UC06 - Memverifikasi Hasil Pembersihan*<br>*UC07 - Melihat Leaderboard* |
| *C08 - AkunRelawan* | *UC01 - Melaporkan Titik Pencemaran*<br>*UC02 - Melihat Data dan Heatmap Pencemaran*<br>*UC03 - Memverifikasi Laporan Pencemaran*<br>*UC04 - Mengklaim Titik Pencemaran*<br>*UC05 - Melaporkan Hasil Pembersihan*<br>*UC06 - Memverifikasi Hasil Pembersihan*<br>*UC07 - Melihat Leaderboard*<br>*UC08 - Mengelola Akun Relawan dan Data Komunitas* |
| *C09 - Komunitas* | *UC08 - Mengelola Akun Relawan dan Data Komunitas* |
| *C10 - PetaHeatmap* | *UC02 - Melihat Data dan Heatmap Pencemaran* |
| *C11 - PelaporanView* | *UC01 - Melaporkan Titik Pencemaran* |
| *C12 - HeatmapView* | *UC02 - Melihat Data dan Heatmap Pencemaran*<br>*UC04 - Mengklaim Titik Pencemaran* |
| *C13 - DashboardVerifikasiView* | *UC03 - Memverifikasi Laporan Pencemaran*<br>*UC06 - Memverifikasi Hasil Pembersihan* |
| *C14 - PembersihanView* | *UC05 - Melaporkan Hasil Pembersihan* |
| *C15 - LeaderboardView* | *UC07 - Melihat Leaderboard* |
| *C16 - PanelAdminView* | *UC08 - Mengelola Akun Relawan dan Data Komunitas* |
| *C17 - PelaporanController* | *UC01 - Melaporkan Titik Pencemaran* |
| *C18 - HeatmapController* | *UC02 - Melihat Data dan Heatmap Pencemaran* |
| *C19 - VerifikasiController* | *UC03 - Memverifikasi Laporan Pencemaran*<br>*UC06 - Memverifikasi Hasil Pembersihan* |
| *C20 - KlaimController* | *UC04 - Mengklaim Titik Pencemaran* |
| *C21 - PembersihanController* | *UC05 - Melaporkan Hasil Pembersihan* |
| *C22 - LeaderboardController* | *UC07 - Melihat Leaderboard* |
| *C23 - AdminController* | *UC08 - Mengelola Akun Relawan dan Data Komunitas* |
| *C24 - Notifikasi* | *UC03 - Memverifikasi Laporan Pencemaran*<br>*UC06 - Memverifikasi Hasil Pembersihan* |
| *C25 - Autentikasi* | *UC01 - Melaporkan Titik Pencemaran*<br>*UC02 - Melihat Data dan Heatmap Pencemaran*<br>*UC03 - Memverifikasi Laporan Pencemaran*<br>*UC04 - Mengklaim Titik Pencemaran*<br>*UC05 - Melaporkan Hasil Pembersihan*<br>*UC06 - Memverifikasi Hasil Pembersihan*<br>*UC07 - Melihat Leaderboard*<br>*UC08 - Mengelola Akun Relawan dan Data Komunitas* |
| *C26 - StorageAdapter* | *UC01 - Melaporkan Titik Pencemaran*<br>*UC05 - Melaporkan Hasil Pembersihan* |

 

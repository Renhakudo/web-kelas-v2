// Konfigurasi Appwrite Cloud untuk Website Kelas Sains Data Terapan A.
// Disediakan Endpoint, Project ID, Database ID, dan ID Koleksi.
// Ubah hanya nilai di dalam tanda kutip ganda sesuai proyek Appwrite Cloud Anda.
window.DATA = window.DATA || {};
window.DATA.appwrite = {
  // Endpoint resmi Appwrite Cloud
  "endpoint": "https://fra.cloud.appwrite.io/v1",
  
  // Masukkan Project ID dari Appwrite Cloud Console > Project Settings
  "projectId": "6ae2a1eb001089e29cbd",
  
  // ID Database
  "databaseId": "sdta_db",
  
  // ID Koleksi
  "collections": {
    "profiles": "profiles",
    "subjects": "subjects",
    "default_schedules": "default_schedules",
    "schedule_overrides": "schedule_overrides",
    "assignments": "assignments",
    "cash_settings": "cash_settings",
    "cash_month_settings": "cash_month_settings",
    "cash_payments": "cash_payments",
    "cash_transactions": "cash_transactions",
    "summaries": "summaries",
    "summary_revisions": "summary_revisions",
    "links": "links",
    "activity_logs": "activity_logs"
  },
  
  // ID Storage Bucket (Menggunakan 1 bucket terpadu untuk Free Plan)
  "buckets": {
    "default": "sdta_storage",
    "avatars": "sdta_storage",
    "attachments": "sdta_storage"
  }
};

<template>
  <div class="app">
    <!-- ヘッダ -->
    <header class="app-header">
      <h1 class="app-title">パスワード管理</h1>
    </header>

    <!-- 検索バー -->
    <div class="search-bar">
      <input
        v-model="searchKeyword"
        class="search-input"
        type="search"
        placeholder="検索 (タイトル・ユーザ名・サイト・メモ)"
        @input="onSearchInput"
      />
    </div>

    <!-- ローディング -->
    <div v-if="loading" class="loading">読み込み中...</div>

    <!-- エラー -->
    <div v-else-if="loadError" class="load-error">
      <p>{{ loadError }}</p>
      <button class="btn btn-primary" @click="fetchList()">再読み込み</button>
    </div>

    <!-- リスト -->
    <div v-else class="list-container">
      <table class="pw-table">
        <thead>
          <tr>
            <th class="col-title sortable" @click="toggleSort('title')">
              タイトル
              <span class="sort-icon">{{ sortIcon('title') }}</span>
            </th>
            <th class="col-user sortable" @click="toggleSort('userword')">
              ユーザ名
              <span class="sort-icon">{{ sortIcon('userword') }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="entry in sortedItems"
            :key="entry.title"
            class="pw-row"
            @click="openDetail(entry)"
          >
            <td class="cell-title">{{ entry.title }}</td>
            <td class="cell-user">{{ entry.userword }}</td>
          </tr>
          <tr v-if="sortedItems.length === 0">
            <td colspan="2" class="empty-msg">
              {{ searchKeyword ? '該当するエントリがありません' : 'エントリがありません' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- FAB -->
    <button class="fab" @click="openCreate" aria-label="新規登録">
      <span class="fab-icon">＋</span>
    </button>

    <!-- 詳細ダイアログ -->
    <DetailDialog
      :entry="detailEntry"
      @close="closeDetail"
      @edit="openEdit"
      @delete="openDeleteConfirm"
    />

    <!-- 編集・新規登録ダイアログ -->
    <EditDialog
      v-if="editDialogOpen"
      :entry="editEntry"
      :is-new="isNewEntry"
      @close="closeEdit"
      @saved="onSaved"
    />

    <!-- 削除確認ダイアログ -->
    <DeleteConfirmDialog
      v-if="deleteTarget"
      :title="deleteTarget.title"
      :deleting="deleting"
      :api-error="deleteError"
      @cancel="closeDeleteConfirm"
      @confirm="doDelete"
    />

    <!-- トースト通知 -->
    <Transition name="toast">
      <div v-if="toast" class="toast" :class="`toast-${toast.type}`">{{ toast.message }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { passwordsApi } from './api/passwords'
import type { PasswordEntry } from './api/types'
import DetailDialog from './components/DetailDialog.vue'
import EditDialog from './components/EditDialog.vue'
import DeleteConfirmDialog from './components/DeleteConfirmDialog.vue'

// ---- state ----
const allItems = ref<PasswordEntry[]>([])
const loading = ref(false)
const loadError = ref<string | null>(null)

const searchKeyword = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null

type SortKey = 'title' | 'userword'
type SortDir = 'asc' | 'desc'
const sortKey = ref<SortKey>('title')
const sortDir = ref<SortDir>('asc')

const detailEntry = ref<PasswordEntry | null>(null)
const editDialogOpen = ref(false)
const editEntry = ref<PasswordEntry | null>(null)
const isNewEntry = ref(false)

const deleteTarget = ref<PasswordEntry | null>(null)
const deleting = ref(false)
const deleteError = ref<string | null>(null)

interface Toast { message: string; type: 'success' | 'error' }
const toast = ref<Toast | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null

// ---- computed ----
const sortedItems = computed(() => {
  const items = [...allItems.value]
  const key = sortKey.value
  const dir = sortDir.value === 'asc' ? 1 : -1
  items.sort((a, b) => a[key].localeCompare(b[key], 'ja') * dir)
  return items
})

// ---- methods ----
async function fetchList(keyword?: string) {
  loading.value = true
  loadError.value = null
  try {
    const res = await passwordsApi.list(keyword)
    allItems.value = res.items
  } catch (e: unknown) {
    loadError.value = e instanceof Error ? e.message : '読み込みに失敗しました'
  } finally {
    loading.value = false
  }
}

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    fetchList(searchKeyword.value || undefined)
  }, 400)
}

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

function sortIcon(key: SortKey): string {
  if (sortKey.value !== key) return '⇅'
  return sortDir.value === 'asc' ? '↑' : '↓'
}

function openDetail(entry: PasswordEntry) {
  detailEntry.value = entry
}

function closeDetail() {
  detailEntry.value = null
}

function openCreate() {
  editEntry.value = null
  isNewEntry.value = true
  editDialogOpen.value = true
}

function openEdit(entry: PasswordEntry) {
  detailEntry.value = null
  editEntry.value = entry
  isNewEntry.value = false
  editDialogOpen.value = true
}

function closeEdit() {
  editDialogOpen.value = false
  editEntry.value = null
}

async function onSaved(data: PasswordEntry) {
  const originalTitle = editEntry.value?.title
  try {
    if (isNewEntry.value) {
      await passwordsApi.create(data)
      showToast('登録しました', 'success')
    } else {
      await passwordsApi.update(originalTitle!, data)
      showToast('更新しました', 'success')
    }
    editDialogOpen.value = false
    editEntry.value = null
    await fetchList(searchKeyword.value || undefined)
  } catch (e: unknown) {
    showToast(e instanceof Error ? e.message : '保存に失敗しました', 'error')
  }
}

function openDeleteConfirm(entry: PasswordEntry) {
  detailEntry.value = null
  deleteTarget.value = entry
  deleteError.value = null
}

function closeDeleteConfirm() {
  deleteTarget.value = null
  deleteError.value = null
  deleting.value = false
}

async function doDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  deleteError.value = null
  try {
    await passwordsApi.delete(deleteTarget.value.title)
    showToast('削除しました', 'success')
    deleteTarget.value = null
    await fetchList(searchKeyword.value || undefined)
  } catch (e: unknown) {
    deleteError.value = e instanceof Error ? e.message : '削除に失敗しました'
  } finally {
    deleting.value = false
  }
}

function showToast(message: string, type: 'success' | 'error') {
  if (toastTimer) clearTimeout(toastTimer)
  toast.value = { message, type }
  toastTimer = setTimeout(() => { toast.value = null }, 3000)
}

onMounted(() => fetchList())
</script>

<style>
/* ============================================================
   リセット & ベーススタイル
   ============================================================ */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Hiragino Sans', 'Noto Sans JP', sans-serif;
  font-size: 15px;
  background: #f0f2f5;
  color: #1a1a2e;
}

#app {
  height: 100%;
}

/* ============================================================
   アプリ全体レイアウト (スマホ縦画面最適化)
   ============================================================ */
.app {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  max-width: 480px;
  margin: 0 auto;
  background: #fff;
  box-shadow: 0 0 20px rgba(0,0,0,.1);
}

/* ヘッダ */
.app-header {
  flex-shrink: 0;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #fff;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: .05em;
}

/* 検索バー */
.search-bar {
  flex-shrink: 0;
  padding: 10px 12px;
  background: #f8f9fb;
  border-bottom: 1px solid #e4e7ec;
}

.search-input {
  width: 100%;
  padding: 9px 12px;
  border: 1.5px solid #d0d5dd;
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
  outline: none;
  transition: border-color .15s;
}

.search-input:focus {
  border-color: #4a6cf7;
}

/* ローディング・エラー */
.loading {
  text-align: center;
  padding: 40px 16px;
  color: #888;
}

.load-error {
  text-align: center;
  padding: 40px 16px;
  color: #e53e3e;
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}

/* リストコンテナ：残りの縦幅をすべて使いスクロール */
.list-container {
  flex: 1 1 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* テーブル */
.pw-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.pw-table thead {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #f8f9fb;
}

.pw-table thead th {
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #555;
  text-align: left;
  border-bottom: 2px solid #e4e7ec;
  user-select: none;
}

.col-title { width: 55%; }
.col-user  { width: 45%; }

.sortable {
  cursor: pointer;
}

.sortable:hover {
  background: #eef0f5;
}

.sort-icon {
  font-size: 11px;
  margin-left: 4px;
  opacity: .7;
}

.pw-row {
  cursor: pointer;
  transition: background .12s;
}

.pw-row:nth-child(even) {
  background: #fafbfd;
}

.pw-row:hover, .pw-row:active {
  background: #eef2ff;
}

.pw-row td {
  padding: 12px 12px;
  font-size: 14px;
  border-bottom: 1px solid #f0f2f5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-title {
  font-weight: 600;
  color: #1a1a2e;
}

.cell-user {
  color: #555;
}

.empty-msg {
  text-align: center;
  padding: 48px 16px !important;
  color: #aaa;
  font-size: 14px;
}

/* ============================================================
   FAB
   ============================================================ */
.fab {
  position: fixed;
  right: calc(50% - 240px + 16px);
  bottom: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4a6cf7 0%, #6a3de8 100%);
  color: #fff;
  border: none;
  box-shadow: 0 4px 16px rgba(74,108,247,.45);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  transition: transform .15s, box-shadow .15s;
}

.fab:hover, .fab:active {
  transform: scale(1.08);
  box-shadow: 0 6px 20px rgba(74,108,247,.6);
}

.fab-icon {
  font-size: 28px;
  line-height: 1;
  font-weight: 300;
}

/* ============================================================
   ダイアログ共通
   ============================================================ */

/* 中央モーダル（全ダイアログ共通） */
.dialog-overlay--center {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  z-index: 200;
  padding: 48px 16px 16px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.dialog {
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 480px;
  max-height: none;
  display: flex;
  flex-direction: column;
  overflow: visible;
  animation: fade-in .2s ease-out;
}

.dialog .dialog-body {
  overflow: visible;
  flex: none;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(-10px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes slide-up {
  from { transform: translateY(30px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 12px;
  border-bottom: 1px solid #e4e7ec;
  flex-shrink: 0;
}

.dialog-title {
  font-size: 17px;
  font-weight: 700;
  color: #1a1a2e;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dialog-body {
  flex: 1 1 0;
  overflow-y: auto;
  padding: 16px;
  -webkit-overflow-scrolling: touch;
}

.dialog-footer {
  flex-shrink: 0;
  display: flex;
  gap: 10px;
  padding: 12px 16px 20px;
  border-top: 1px solid #e4e7ec;
  justify-content: flex-end;
}

/* ============================================================
   詳細ダイアログ
   ============================================================ */
.detail-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.detail-row {
  padding: 10px 0;
  border-bottom: 1px solid #f0f2f5;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row dt {
  font-size: 12px;
  color: #888;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .04em;
  margin-bottom: 4px;
}

.detail-row dd {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.detail-value {
  font-size: 15px;
  color: #1a1a2e;
  word-break: break-all;
  flex: 1;
}

.pw-mask {
  font-family: monospace;
  letter-spacing: .05em;
  white-space: pre-wrap;
  word-break: break-all;
}

.password-row {
  flex-direction: column;
  align-items: flex-start !important;
  gap: 6px !important;
}

.pw-actions {
  display: flex;
  gap: 8px;
}

.memo-value {
  font-size: 14px;
  color: #444;
  white-space: pre-wrap;
  word-break: break-word;
  flex: 1 1 100%;
}

.site-link {
  color: #4a6cf7;
  font-size: 14px;
  word-break: break-all;
  text-decoration: none;
}

.site-link:hover {
  text-decoration: underline;
}

/* ============================================================
   ボタン共通
   ============================================================ */
.btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: opacity .15s, transform .1s;
}

.btn:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.btn:active:not(:disabled) {
  transform: scale(.97);
}

.btn-primary {
  background: #4a6cf7;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #3a5ce6;
}

.btn-edit {
  background: #f7a34a;
  color: #fff;
}

.btn-edit:hover {
  background: #e6913a;
}

.btn-delete {
  background: #fff;
  color: #e53e3e;
  border: 1.5px solid #e53e3e;
}

.btn-delete:hover {
  background: #fff5f5;
}

.btn-delete-confirm {
  background: #e53e3e;
  color: #fff;
}

.btn-delete-confirm:hover:not(:disabled) {
  background: #c53030;
}

.btn-cancel {
  background: #f0f2f5;
  color: #555;
}

.btn-cancel:hover:not(:disabled) {
  background: #e4e7ec;
}

.copy-btn {
  padding: 4px 10px;
  font-size: 12px;
  border-radius: 6px;
  border: 1.5px solid #4a6cf7;
  background: #fff;
  color: #4a6cf7;
  cursor: pointer;
  transition: background .12s, color .12s;
  white-space: nowrap;
}

.copy-btn.copied {
  background: #4a6cf7;
  color: #fff;
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: background .12s;
}

.icon-btn:hover {
  background: #f0f2f5;
}

.close-btn {
  font-size: 16px;
  color: #888;
}

/* ============================================================
   フォーム
   ============================================================ */
.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #444;
  margin-bottom: 5px;
}

.form-label.required::after {
  content: ' *';
  color: #e53e3e;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid #d0d5dd;
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
  outline: none;
  transition: border-color .15s;
  color: #1a1a2e;
}

.form-input:focus {
  border-color: #4a6cf7;
}

.form-input.error {
  border-color: #e53e3e;
}

.form-input:disabled {
  background: #f5f5f5;
  color: #888;
}

.form-textarea {
  resize: vertical;
  min-height: 72px;
}

.form-error {
  display: block;
  font-size: 12px;
  color: #e53e3e;
  margin-top: 4px;
}

.input-with-btn {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* パスワード textarea のようにアイコンを上揃え */
.input-with-btn--top {
  align-items: flex-start;
}

.input-with-btn .form-input {
  flex: 1;
}

.input-icon-btn {
  flex-shrink: 0;
}

/* パスワードマスク (WebKit/Blink 系) */
.pw-textarea {
  font-family: monospace;
  resize: vertical;
}

.pw-masked {
  -webkit-text-security: disc;
}

.api-error {
  background: #fff5f5;
  border: 1px solid #fc8181;
  color: #e53e3e;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 13px;
  margin-bottom: 12px;
}

/* ============================================================
   削除確認
   ============================================================ */
.confirm-msg {
  font-size: 15px;
  color: #333;
  line-height: 1.7;
  padding: 8px 0;
}

.confirm-msg strong {
  color: #1a1a2e;
}

/* ============================================================
   トースト
   ============================================================ */
.toast {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 24px;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 600;
  z-index: 500;
  pointer-events: none;
  white-space: nowrap;
  box-shadow: 0 4px 16px rgba(0,0,0,.2);
}

.toast-success {
  background: #2d9d5c;
  color: #fff;
}

.toast-error {
  background: #e53e3e;
  color: #fff;
}

.toast-enter-active, .toast-leave-active {
  transition: opacity .25s, transform .25s;
}

.toast-enter-from, .toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}

/* ============================================================
   デスクトップでのFAB位置調整
   ============================================================ */
@media (min-width: 480px) {
  .fab {
    right: calc(50% - 240px + 16px);
  }
}

@media (max-width: 480px) {
  .fab {
    right: 16px;
  }
}
</style>

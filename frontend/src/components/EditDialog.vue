<template>
  <Teleport to="body">
    <div class="dialog-overlay--center" @click.self="onCancel">
      <div class="dialog dialog--center">
        <div class="dialog-header">
          <h2 class="dialog-title">{{ isNew ? '新規登録' : '編集' }}</h2>
          <button class="icon-btn close-btn" @click="onCancel" aria-label="閉じる">✕</button>
        </div>
        <form class="dialog-body" @submit.prevent="onSubmit">
          <div class="form-group">
            <label class="form-label required">タイトル</label>
            <input
              v-model="form.title"
              class="form-input"
              :class="{ error: errors.title }"
              type="text"
              placeholder="タイトルを入力"
              :disabled="!isNew && !titleEditing"
            />
            <span v-if="errors.title" class="form-error">{{ errors.title }}</span>
          </div>
          <div class="form-group">
            <label class="form-label required">ユーザ名</label>
            <input
              v-model="form.userword"
              class="form-input"
              :class="{ error: errors.userword }"
              type="text"
              placeholder="ユーザ名を入力"
            />
            <span v-if="errors.userword" class="form-error">{{ errors.userword }}</span>
          </div>
          <div class="form-group">
            <label class="form-label required">パスワード</label>
            <div class="input-with-btn input-with-btn--top">
              <textarea
                v-model="form.psword"
                class="form-input form-textarea pw-textarea"
                :class="{ error: errors.psword, 'pw-masked': !showPassword }"
                placeholder="パスワードを入力（複数行可）"
                rows="3"
                autocomplete="new-password"
                spellcheck="false"
              />
              <button type="button" class="icon-btn input-icon-btn" @click="showPassword = !showPassword">
                <span v-if="showPassword">🙈</span>
                <span v-else>👁</span>
              </button>
            </div>
            <span v-if="errors.psword" class="form-error">{{ errors.psword }}</span>
          </div>
          <div class="form-group">
            <label class="form-label">サイトURL</label>
            <input
              v-model="form.site"
              class="form-input"
              type="url"
              placeholder="https://example.com"
            />
          </div>
          <div class="form-group">
            <label class="form-label">メモ</label>
            <textarea
              v-model="form.memo"
              class="form-input form-textarea"
              placeholder="メモを入力"
              rows="3"
            />
          </div>
          <div v-if="apiError" class="api-error">{{ apiError }}</div>
          <div class="dialog-footer">
            <button type="button" class="btn btn-cancel" @click="onCancel">キャンセル</button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              {{ submitting ? '保存中...' : '保存' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import type { PasswordEntry } from '../api/types'

const props = defineProps<{
  entry: PasswordEntry | null
  isNew: boolean
}>()

const emit = defineEmits<{
  close: []
  saved: [entry: PasswordEntry]
}>()

const showPassword = ref(false)
const titleEditing = ref(false)
const submitting = ref(false)
const apiError = ref<string | null>(null)

const form = reactive({
  title: '',
  userword: '',
  psword: '',
  site: '',
  memo: '',
})

const errors = reactive({
  title: '',
  userword: '',
  psword: '',
})

watch(() => props.entry, (entry) => {
  if (entry) {
    form.title = entry.title
    form.userword = entry.userword
    form.psword = entry.psword
    form.site = entry.site || ''
    form.memo = entry.memo || ''
  } else {
    form.title = ''
    form.userword = ''
    form.psword = ''
    form.site = ''
    form.memo = ''
  }
  errors.title = ''
  errors.userword = ''
  errors.psword = ''
  apiError.value = null
  showPassword.value = false
  titleEditing.value = false
  submitting.value = false
}, { immediate: true })

function validate(): boolean {
  errors.title = ''
  errors.userword = ''
  errors.psword = ''

  let valid = true
  if (!form.title.trim()) {
    errors.title = 'タイトルは必須です'
    valid = false
  }
  if (!form.userword.trim()) {
    errors.userword = 'ユーザ名は必須です'
    valid = false
  }
  if (!form.psword) {
    errors.psword = 'パスワードは必須です'
    valid = false
  }
  return valid
}

async function onSubmit() {
  if (!validate()) return
  apiError.value = null
  submitting.value = true

  const data = {
    title: form.title.trim(),
    userword: form.userword.trim(),
    psword: form.psword,
    site: form.site.trim() || null,
    memo: form.memo.trim() || null,
  }

  emit('saved', data as PasswordEntry)
}

function onCancel() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="entry" class="dialog-overlay--center" @click.self="$emit('close')">
      <div class="dialog dialog--center">
        <div class="dialog-header">
          <h2 class="dialog-title">{{ entry.title }}</h2>
          <button class="icon-btn close-btn" @click="$emit('close')" aria-label="閉じる">✕</button>
        </div>
        <div class="dialog-body">
          <dl class="detail-list">
            <div class="detail-row">
              <dt>ユーザ名</dt>
              <dd>
                <span class="detail-value">{{ entry.userword }}</span>
                <button
                  class="copy-btn"
                  :class="{ copied: copiedField === 'userword' }"
                  @click="copyField(entry.userword, 'userword')"
                >{{ copiedField === 'userword' ? 'コピー済' : 'コピー' }}</button>
              </dd>
            </div>
            <div class="detail-row">
              <dt>パスワード</dt>
              <dd class="password-row">
                <span class="detail-value pw-mask">{{ showPassword ? entry.psword : '••••••••' }}</span>
                <div class="pw-actions">
                  <button
                    class="copy-btn"
                    :class="{ copied: copiedField === 'psword' }"
                    @click="copyField(entry.psword, 'psword')"
                  >{{ copiedField === 'psword' ? 'コピー済' : 'コピー' }}</button>
                  <button class="icon-btn" @click="showPassword = !showPassword" :aria-label="showPassword ? '隠す' : '表示'">
                    <span v-if="showPassword">🙈</span>
                    <span v-else>👁</span>
                  </button>
                </div>
              </dd>
            </div>
            <div v-if="entry.site" class="detail-row">
              <dt>サイト</dt>
              <dd>
                <a :href="entry.site" target="_blank" rel="noopener noreferrer" class="site-link">{{ entry.site }}</a>
              </dd>
            </div>
            <div v-if="entry.memo" class="detail-row">
              <dt>メモ</dt>
              <dd class="memo-value">{{ entry.memo }}</dd>
            </div>
          </dl>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-edit" @click="$emit('edit', entry)">編集</button>
          <button class="btn btn-delete" @click="$emit('delete', entry)">削除</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { PasswordEntry } from '../api/types'

defineProps<{
  entry: PasswordEntry | null
}>()

defineEmits<{
  close: []
  edit: [entry: PasswordEntry]
  delete: [entry: PasswordEntry]
}>()

const showPassword = ref(false)
const copiedField = ref<string | null>(null)

async function copyField(value: string, field: string) {
  try {
    await navigator.clipboard.writeText(value)
    copiedField.value = field
    setTimeout(() => { copiedField.value = null }, 2000)
  } catch {
    // ignore
  }
}
</script>

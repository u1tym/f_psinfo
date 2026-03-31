<template>
  <Teleport to="body">
    <div class="dialog-overlay--center" @click.self="$emit('cancel')">
      <div class="dialog dialog--center">
        <div class="dialog-header">
          <h2 class="dialog-title">削除の確認</h2>
        </div>
        <div class="dialog-body">
          <p class="confirm-msg">
            「<strong>{{ title }}</strong>」を削除しますか？<br>
            この操作は取り消せません。
          </p>
          <div v-if="apiError" class="api-error">{{ apiError }}</div>
        </div>
        <div class="dialog-footer">
          <button class="btn btn-cancel" @click="$emit('cancel')" :disabled="deleting">キャンセル</button>
          <button class="btn btn-delete-confirm" @click="$emit('confirm')" :disabled="deleting">
            {{ deleting ? '削除中...' : '削除する' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  deleting: boolean
  apiError: string | null
}>()

defineEmits<{
  cancel: []
  confirm: []
}>()
</script>

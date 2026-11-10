<template>
  <div class="login-wrapper">
    <div class="login-card">
      <div class="login-brand">
        <div class="brand-avatar">
          <IconHeadset :size="28" stroke-width="2" />
        </div>
        <h1 class="brand-title">Helpdesk Campus</h1>
        <p class="brand-desc">Plataforma de soporte y gestión de incidencias académicas</p>
      </div>

      <form class="login-form" @submit.prevent="handleLogin">
        <!-- Error Alert -->
        <div v-if="error" class="login-error-alert">
          <IconAlertCircle :size="18" class="error-alert-icon" />
          <span>{{ error }}</span>
        </div>

        <!-- Campo Correo -->
        <div class="form-group">
          <label class="input-label">Correo Institucional</label>
          <div class="input-container">
            <IconMail :size="18" class="field-icon" />
            <input
              v-model="form.email"
              type="email"
              class="field-input"
              placeholder="admin@helpdesk.com"
              required
              autocomplete="email"
            />
          </div>
        </div>

        <!-- Campo Contraseña -->
        <div class="form-group">
          <label class="input-label">Contraseña de Acceso</label>
          <div class="input-container">
            <IconLock :size="18" class="field-icon" />
            <input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              class="field-input"
              placeholder="••••••••"
              required
              autocomplete="current-password"
            />
            <button
              type="button"
              class="password-toggle-btn"
              tabindex="-1"
              @click="showPassword = !showPassword"
            >
              <IconEyeOff v-if="showPassword" :size="18" />
              <IconEye v-else :size="18" />
            </button>
          </div>
        </div>

        <!-- Botón Ingresar -->
        <Button
          type="submit"
          label="Iniciar Sesión"
          severity="primary"
          class="login-submit-btn"
          :loading="loading"
        >
          <template #icon>
            <IconLogin :size="18" class="p-button-icon-left" />
          </template>
        </Button>
      </form>

      <div class="login-footer">
        <span>Sistema Integrado Helpdesk & Moodle</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import {
  IconHeadset,
  IconMail,
  IconLock,
  IconEye,
  IconEyeOff,
  IconLogin,
  IconAlertCircle,
} from '@tabler/icons-vue'
import { useAuthStore } from '../../stores/auth.js'

const auth   = useAuthStore()
const router = useRouter()

const form         = ref({ email: '', password: '' })
const showPassword = ref(false)
const loading      = ref(false)
const error        = ref(null)

async function handleLogin() {
  loading.value = true
  error.value   = null

  try {
    await auth.loginUser(form.value)
    router.push({ name: 'dashboard' })
  } catch (e) {
    error.value = e.response?.data?.message || 'Credenciales incorrectas o servidor no disponible.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 50% 20%, var(--color-slate-800), var(--color-slate-900) 70%);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: var(--surface-card);
  border-radius: 16px;
  padding: 36px 32px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.login-brand {
  text-align: center;
  margin-bottom: 28px;
}

.brand-avatar {
  width: 56px;
  height: 56px;
  margin: 0 auto 14px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--color-primary-600), var(--color-primary-400));
  color: var(--text-inverse);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 16px rgba(14, 165, 233, 0.3);
}

.brand-title {
  font-size: 22px;
  font-weight: 800;
  color: var(--text-main);
  letter-spacing: -0.4px;
  margin: 0;
}

.brand-desc {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 6px;
  line-height: 1.4;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.login-error-alert {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--color-danger-50);
  border: 1px solid var(--color-danger-200);
  color: var(--color-danger-700);
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
}

.error-alert-icon {
  flex-shrink: 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.input-label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-body);
}

.input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.field-icon {
  position: absolute;
  left: 12px;
  color: var(--text-subtle);
  pointer-events: none;
}

.field-input {
  width: 100%;
  padding: 10px 40px 10px 38px;
  background: var(--surface-input);
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-main);
  outline: none;
  transition: all 0.2s ease;
}

.field-input:focus {
  background: var(--surface-input-focus);
  border-color: var(--border-focus);
  box-shadow: 0 0 0 3px var(--focus-ring);
}

.password-toggle-btn {
  position: absolute;
  right: 10px;
  background: transparent;
  border: none;
  color: var(--text-subtle);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  transition: color 0.15s;
}

.password-toggle-btn:hover {
  color: var(--color-slate-600);
}

.login-submit-btn {
  width: 100%;
  padding: 11px;
  font-weight: 700;
  margin-top: 6px;
}

.login-footer {
  margin-top: 24px;
  text-align: center;
  font-size: 11.5px;
  color: var(--text-subtle);
  border-top: 1px solid var(--border-subtle);
  padding-top: 14px;
}

.p-button-icon-left {
  margin-right: 6px;
}
</style>

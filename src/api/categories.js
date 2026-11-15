import api from './axios.js'

export const getCategories = (params) => api.get('/categories', { params })
export const getCategory = (id) => api.get(`/categories/${id}`)
export const createCategory = (data) => api.post('/categories', data)
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data)
export const toggleCategoryActive = (id) => api.patch(`/categories/${id}/toggle-active`)
export const deleteCategory = (id) => api.delete(`/categories/${id}`)

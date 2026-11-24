import api from './axios.js'

export const globalSearch = (query) => {
  return api.get('/search', { params: { q: query } })
}

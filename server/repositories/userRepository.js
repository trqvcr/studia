const supabase = require('../db')

async function findByUsername(username) {
  const { data, error } = await supabase
    .from('users').select().eq('username', username).single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

async function findByCredentials(username, password) {
  const { data, error } = await supabase
    .from('users').select().eq('username', username).eq('password', password).single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

async function findById(id) {
  const { data, error } = await supabase
    .from('users').select().eq('id', id).single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

async function searchByUsername(username) {
  const { data, error } = await supabase
    .from('users').select().ilike('username', `%${username}%`)
  if (error) throw error
  return data
}

async function findManyByIds(ids) {
  const { data, error } = await supabase
    .from('users').select('id, username, name').in('id', ids)
  if (error) throw error
  return data
}

async function create({ username, password, name }) {
  const { data, error } = await supabase
    .from('users').insert({ username, password, name }).select().single()
  if (error) throw error
  return data
}

module.exports = { findByUsername, findByCredentials, findById, searchByUsername, findManyByIds, create }

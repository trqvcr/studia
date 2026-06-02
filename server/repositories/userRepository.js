const supabase = require('../db')
const bcrypt = require('bcrypt')

async function findByUsername(username) {
  const { data, error } = await supabase
    .from('users').select().eq('username', username).single()
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
  const hashedPassword = await
  bcrypt.hash(password, 10)
  const { data, error } = await supabase
    .from('users').insert({ username, password: hashedPassword, name }).select().single()
  if (error) throw error
  return data
}

module.exports = { findByUsername, findById, searchByUsername, findManyByIds, create, getClasses, setClasses }

async function getClasses(userId){
  const {data, error} = await supabase
  .from('users').select('classes').eq('id', userId).single()
  if (error) throw error
  return data.classes
}

async function setClasses(userId, classes){
  const {data, error} = await supabase
  .from('users').update({classes}).eq('id', userId).select('classes').single()
  if (error) throw error
  return data.classes
}

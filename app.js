'use strict'

import { csvParse, csvFormat } from 'https://cdn.jsdelivr.net/npm/d3-dsv@3/+esm'
import { getFormData } from './form-data.js'
import { Show_Btn, insert_switches, fill_table, filter_input, handle_db_err, remove_diacritics } from './core-funcs.js'

// Migration {

// todo: delete all data of the previous data model.
// todo: implement windows.onerror.

let oldData = JSON.parse(localStorage.getItem('meters'));

if (Array.isArray(oldData) && !Array.isArray(oldData[0]))
{
   localStorage.clear()
}

oldData = null

// }

if ("serviceWorker" in navigator)
{
   try
   {
      navigator.serviceWorker.register('./service-worker.js')
   } catch (error)
   {
      console.error(`Your browser seems to support service workers, but the registration of this app's worker failed with error: ${error}`)
   }
} else
{
   console.error("This app's service worker couldn't be installed because you're in Private Mode or your browser doesn't support service workers!")
}

const meters_section_b = document.getElementById('meters-section')
const csv_section_b = document.getElementById('csv-section')

const table_select = document.getElementById('history')
const meters_table = document.getElementById('meters-table')
const meters_switchbox = document.getElementById('meters-switches')
const meters_searchbox = document.getElementById('meter-search')

const add_meter_b = document.getElementById('meter-add-btn')
const new_meter_f = document.getElementById('meter-form')
const repeated_err_f = document.getElementById('meter-error-form')
const repeated_meter = document.getElementById('meter-repeated')
const meter_filter = document.getElementById('meter-filter')
const meter_added_f = document.getElementById('meter-added-form')

const add_reading_b = document.getElementById('reading-btn')
const new_reading_f = document.getElementById('reading-form')
const reading_confirmed_f = document.getElementById('read-confirm-form')
const no_such_meter_f = document.getElementById('meter-non-existant-form')
const non_existant_meter = document.getElementById('non-existant-meter')
const meter_already_read_f = document.getElementById('meter-already-read-form')
const already_read_meter = document.querySelectorAll('.already-read-meter')

const caseríos_datalist = document.getElementById('suggested-caseríos')
const meters_datalist = document.getElementById('suggested-meters')

const meters = {
   current: { key: null, data: null },
   last: { key: null, data: null }
}

// To limit the min lectura to the previously-taken lectura {
const medidorBeingRead = document.getElementById('meter-being-read')
const lecturaInput = document.getElementById('meter-reading')
// }

// To set today as the default value in all dates {
const initial_date = document.getElementById('fecha-inicial')
const measurement_date = document.getElementById('fecha-lectura-actual')
// }

const fees_table = document.getElementById('fees-table')
const fees_section_b = document.getElementById('fees-section')
const fees_searchbox = document.getElementById('fees-search')

const iframe = document.getElementById('receipt')

const csv_b = document.getElementById('csv-btn')
const csv_table = document.getElementById('csv-table')
const csv_filter = document.getElementById('csv-filter')
const csv_switchbox = document.getElementById('csv-switches')
const csv_searchbox = document.getElementById('csv-search')

const csv = {
   current: { data: null }
}

const dl_meters_csv_b = document.getElementById('export-meters-csv')
const dl_meters_json_b = document.getElementById('export-meters-json')

const print_b = document.getElementById('print-btn')


const open_req = indexedDB.open('meters', 1)
let db = null
let fees = null


open_req.onerror = handle_db_err

open_req.onupgradeneeded = upgrade_needed_ev => {

   localStorage.setItem(
      'fees',
      JSON.stringify([
         { mínimo: 0, máximo: 6, fórmula: '2.61' },
         { mínimo: 7, máximo: 40, fórmula: '0.25 * consumo + 1.60' },
         { mínimo: 41, máximo: 50, fórmula: '0.40 * (consumo - 40) + 10 + 1.60' },
         { mínimo: 51, máximo: 100, fórmula: '0.75 * consumo + 1.60' },
         { mínimo: 101, máximo: 150, fórmula: '1.00 * consumo + 1.60' },
         { mínimo: 151, máximo: 200, fórmula: '1.25 * consumo + 1.60' },
         { mínimo: 201, máximo: null, fórmula: '1.50 * consumo + 1.60' }
      ])
   )

   const db = upgrade_needed_ev.target.result

   db
      .createObjectStore('meters', { autoIncrement: true })
      .add([])

   // todo: create indexes.
}

open_req.onsuccess = success_ev => {

   db = success_ev.target.result

   db.onversionchange = () => {

      db.close()
      alert('La base de datos está desactualizada! Por favor recargue la app o ciérrela y vuélvala a abrir.')
   }

   db.onerror = handle_db_err

   update_select()
   fees = JSON.parse(localStorage.getItem('fees'))
   fill_table(fees_table, fees, ['mínimo', 'máximo', 'fórmula'])
}

print_b.addEventListener('click', () => {

   iframe.contentWindow.focus()
   iframe.contentWindow.print();
}, { passive: true })

meters_table.addEventListener('click', click_ev => {

   const clicked_row = click_ev.target.closest('tr')

   if (!clicked_row) return

   const meter = clicked_row.querySelector('.medidor').textContent
   const data_row = meters.current.data.find(row => row.medidor === meter)

   const span = document.createElement('span')
   span.textContent = JSON.stringify(data_row)

   iframe.contentDocument.body.append(span)


   iframe.parentElement.parentElement.showModal()

})

table_select.addEventListener('change', changeEv => {

   meters.current.key = Number(changeEv.target.value)

   const query = db.transaction('meters', 'readonly').objectStore('meters').get(meters.current.key)

   query.onsuccess = success_ev => {

      if (meters.current.key === meters.last.key)
      {
         meters.last.data = success_ev.target.result
      }

      meters.current.data = success_ev.target.result

      // This array could be global with no issues:

      const def_col_order = ['medidor', 'zona', 'titular', 'caserío', 'lectura_anterior', 'desde', 'lectura_actual', 'hasta']

      fill_table(meters_table, meters.current.data, def_col_order)
      insert_switches(meters_switchbox, meters_table, def_col_order)

      if (meters.current.key !== meters.last.key)
      {
         add_meter_b.setAttribute('disabled', '')
         add_reading_b.setAttribute('disabled', '')
         meters_table.tBodies[0].classList.add('non-first')
      }
      else
      {
         add_meter_b.removeAttribute('disabled')
         add_reading_b.removeAttribute('disabled')
         meters_table.tBodies[0].classList.remove('non-first')
      }
   }

}, { passive: true })

add_meter_b.addEventListener('click', () => {

   initial_date.value = new Date().toLocaleDateString('en-ca')
   fill_datalist(caseríos_datalist, 'caserío')
   new_meter_f.parentElement.showModal()

}, { passive: true })

new_meter_f.addEventListener('submit', submit_ev => {

   const form_data = getFormData(submit_ev.target, ['medidor'])
   const meter_is_duplicate = meters.last.data.find(row => row.medidor === form_data.medidor)

   if (meter_is_duplicate)
   {
      repeated_meter.textContent = form_data.medidor
      repeated_err_f.parentElement.showModal()
      return
   }

   form_data.lectura_actual = undefined
   form_data.hasta = undefined
   meters.last.data.push(form_data)

   const query = db
      .transaction('meters', 'readwrite')
      .objectStore('meters')
      .put(meters.last.data, meters.last.key)

   query.onsuccess = () => {
      meter_added_f.parentElement.showModal()
      table_select.dispatchEvent(new Event('change'))
   }

}, { passive: true })


meter_filter.addEventListener(
   'input',
   input_ev => filter_input(meters_table, input_ev),
   { passive: true }
)

new Show_Btn(meters_section_b, meters_table, meters_searchbox)

add_reading_b.addEventListener('click', () => {

   fill_datalist(meters_datalist, 'medidor')
   measurement_date.value = new Date().toLocaleDateString('en-ca')
   new_reading_f.parentElement.showModal()

}, { passive: true })

new_reading_f.addEventListener('submit', submit_ev => {

   const form_data = getFormData(submit_ev.target, ['medidor'])
   const matching_meter = meters.last.data.find(row => row.medidor === form_data.medidor)

   if (!matching_meter)
   {
      non_existant_meter.textContent = form_data.medidor
      no_such_meter_f.parentElement.showModal()
      return
   }

   const no_measurement = typeof matching_meter.lectura_actual !== 'number'

   if (no_measurement)
   {
      matching_meter.lectura_actual = form_data.lectura_actual
      matching_meter.hasta = form_data.hasta

      const put_req = db
         .transaction('meters', 'readwrite')
         .objectStore('meters')
         .put(meters.last.data, meters.last.key)

      put_req.onsuccess = () => {

         reading_confirmed_f.parentElement.showModal()

         if (meters.current.key === meters.last.key)
         {
            table_select.dispatchEvent(new Event('change'))
         }
      }

      return
   }

   const all_meters_read = meters.last.data.every(row => row.lectura_actual)

   if (all_meters_read)
   {
      const new_table_data = []

      for (const row_old_version of meters.last.data)
      {
         const { medidor, zona, titular, caserío, lectura_actual, hasta } = row_old_version

         const row_new_version = {
            medidor,
            zona,
            titular,
            caserío,
            lectura_anterior: lectura_actual,
            desde: hasta,
            lectura_actual: form_data.medidor === medidor ? form_data.lectura_actual : undefined,
            hasta: form_data.medidor === medidor ? form_data.hasta : undefined
         }

         new_table_data.push(row_new_version)
      }

      const add_req = db
         .transaction('meters', 'readwrite')
         .objectStore('meters')
         .add(new_table_data)

      add_req.onsuccess = () => {

         update_select()
         reading_confirmed_f.parentElement.showModal()
      }
   }
   else
   {
      for (const span of already_read_meter)
      {
         span.textContent = form_data.medidor
      }

      meter_already_read_f.parentElement.showModal()
   }

})

new Show_Btn(csv_section_b, csv_table, csv_searchbox)

csv_b.addEventListener('change', change_ev => {

   const file = change_ev.currentTarget.files[0]

   if (!file)
   {
      return
   }

   const reader = new FileReader()

   reader.onload = function (load_ev) {

      csv.current.data = csvParse(load_ev.target.result)
      delete csv.current.data.columns

      const def_col_order = Object.keys(csv.current.data[0])

      fill_table(csv_table, csv.current.data, def_col_order)
      insert_switches(csv_switchbox, csv_table, def_col_order)

      meters_table.hidden = true
      meters_searchbox.hidden = true
      csv_table.hidden = false
      csv_searchbox.hidden = false
      csv_filter.disabled = false
   }

   reader.readAsText(file)
})

csv_filter.addEventListener(
   'input',
   input_ev => filter_input(csv_table, input_ev),
   { passive: true }
)

dl_meters_csv_b.addEventListener('click', () => {

   const csv_doc = csvFormat(meters_table.hidden ? csv.current.data : meters.current.data)
   const link = document.createElement('a')

   link.href = URL.createObjectURL(new Blob(
      [csv_doc],
      { type: 'text/csv', endings: 'native' }
   ))

   link.download = 'tabla.csv'
   link.click()
   URL.revokeObjectURL(link.href)

}, { passive: true })

dl_meters_json_b.addEventListener('click', () => {

   const json_data = JSON.stringify(meters_table.hidden ? csv.current.data : meters.current.data, null, 3)
   const link = document.createElement('a')

   link.href = URL.createObjectURL(new Blob(
      [json_data],
      { type: 'application/json' }
   ))

   link.download = 'tabla.json'
   link.click()
   URL.revokeObjectURL(link.href)

}, { passive: true })


new Show_Btn(fees_section_b, fees_table, fees_searchbox)

// const consumo = 20
// const formula = fees.find(row => row.mínimo >= consumo && (row.máximo ?? Number.MAX_SAFE_INTEGER) <= consumo)
// console.log(eval(formula))

//* FUNCTIONS:

function name_dl_file() {

   // TODO
   // meters.last.data[0]?.
}

function fill_datalist(datalist, col_key) {

   datalist.textContent = ''

   const uniques = new Set(meters.last.data.map(meter => meter[col_key]))

   for (const unique_val of uniques)
   {
      const option = document.createElement('option')
      option.value = unique_val
      datalist.append(option)
   }
}

function update_select() {

   const query = db.transaction('meters', 'readonly').objectStore('meters').getAllKeys()

   query.onsuccess = success_ev => {

      const table_keys = success_ev.target.result
      const prev_last_key = meters.last.key

      meters.last.key = table_keys.at(-1)
      table_select.textContent = ''

      for (const num_key of table_keys)
      {
         const option = document.createElement('option')
         option.value = num_key
         option.textContent = num_key

         if (num_key === meters.current.key || num_key === meters.last.key)
         {
            option.setAttribute('selected', '')
         }

         table_select.prepend(option)
      }

      if (prev_last_key !== meters.last.key)
      {
         table_select.dispatchEvent(new Event('change'))
      }

   }
}

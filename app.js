'use strict'

import { csvParse, csvFormat } from 'https://cdn.jsdelivr.net/npm/d3-dsv@3/+esm'
import { getFormData } from './form-data.js'
import { Show_Btn, insert_switches, fill_table, filter_input, handle_db_err, remove_diacritics } from './core-funcs.js'

// Migration {

// todo: delete all data of the previous data model.
// todo: implement window.onerror.

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
const help_section_b = document.getElementById('help-section')

const num_recibo_f = document.getElementById('num-recibo')
const set_receipt_b = document.getElementById('set-receipt-btn')
const err_receipt_f = document.getElementById('err-num-recibo')
const num_first_receipt = document.getElementById('num-first-receipt')
const num_next_receipt = document.getElementById('num-next-receipt')
const total_meters = document.getElementById('total-medidores')
const receipts_container = document.getElementById('receipts')
const print_all_b = document.getElementById('print-all-btn')

const table_select = document.getElementById('history')
const meters_table = document.getElementById('meters-table')
const meters_switchbox = document.getElementById('meters-switches')
const meters_searchbox = document.getElementById('meter-search')
const cell_options_f = document.getElementById('cell-options')
const no_print_f = document.getElementById('no-print-f')

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
const err_desde_hasta_f = document.getElementById('err-desde-hasta')
const err_lecturas = document.getElementById('err-lecturas')

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
const measurement_date = document.getElementById('fecha-lectura-actual')
// }

const fees_section_b = document.getElementById('fees-section')
const fees_table = document.getElementById('fees-table')
const fees_searchbox = document.getElementById('fees-search')

const csv_table = document.getElementById('csv-table')
const csv_b = document.getElementById('csv-btn')
const csv_filter = document.getElementById('csv-filter')
const csv_switchbox = document.getElementById('csv-switches')
const csv_searchbox = document.getElementById('csv-search')

const csv = {
   current: { data: null }
}

const user_guide = document.getElementById('user-guide')
const help_search = document.getElementById('help-search')

const dl_meters_csv_b = document.getElementById('export-meters-csv')
const dl_meters_json_b = document.getElementById('export-meters-json')

const ms_in_a_day = 24 * 60 * 60 * 1000

const receipt_template = document.getElementById('receipt-template')
// const receipt_template = document.getElementById('remove-this-id')
// The id below must be removed in order to avoid several elements with the same id:
// receipt_template.removeAttribute('id')

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
   fill_fees_table(['mínimo', 'máximo', 'fórmula'])


}

let receipt = JSON.parse(localStorage.getItem('receipt')) ?? {}
num_first_receipt.textContent = receipt.first ?? 'indefinido'
num_next_receipt.textContent = receipt.next ?? 'indefinido'

set_receipt_b.addEventListener('click', () => {

   const receipt_num_given = meters.last.data.some(row => typeof row.recibo === 'number')
      || meters.current.data.some(row => typeof row.recibo === 'number')

   if (receipt_num_given)
   {
      err_receipt_f.parentElement.showModal()
      return
   }

   num_recibo_f.parentElement.showModal()
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

      const def_col_order = ['medidor', 'zona', 'titular', 'caserío', 'lectura_anterior', 'desde', 'lectura_actual', 'hasta', 'recibo']

      fill_table(meters_table, meters.current.data, def_col_order)
      insert_switches(meters_switchbox, meters_table, def_col_order)
      th_sort_meters()
      cell_options()
      total_meters.textContent = meters_table.tBodies[0].rows.length

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

      receipts_container.textContent = ''

      for (const receipt_data of meters.current.data)
      {
         if (receipt_data.recibo === undefined) continue

         const new_receipt = receipt_template.content.cloneNode(true)
         const fields = new_receipt.querySelectorAll('[data-field]')

         for (const field of fields)
         {
            switch (field.getAttribute('data-field'))
            {
               case 'nombre': field.textContent = receipt_data.titular; break
               case 'caserio': field.textContent = receipt_data['caserío']; break
               case 'recibo': field.textContent = receipt_data.recibo; break
               case 'medidor': field.textContent = receipt_data.medidor; break
               case 'zona': field.textContent = receipt_data.zona; break
               case 'desde':
                  field.textContent = new Date(receipt_data.desde).toLocaleDateString('es', {
                     day: 'numeric',
                     year: 'numeric',
                     month: 'short',
                     timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                  })
                  break

               case 'hasta':
                  field.textContent = new Date(receipt_data.hasta).toLocaleDateString('es', {
                     day: 'numeric',
                     year: 'numeric',
                     month: 'short',
                     timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
                  })
                  break
               case 'lectura_anterior': field.textContent = receipt_data.lectura_anterior; break
               case 'lectura_actual': field.textContent = receipt_data.lectura_actual; break
               case 'cubre':
                  field.textContent = (receipt_data.hasta - receipt_data.desde) / ms_in_a_day
                  break

               case 'consumo':
                  field.textContent = receipt_data.lectura_actual - receipt_data.lectura_anterior
                  break

               case 'cargo':
                  const consumo = receipt_data.lectura_actual - receipt_data.lectura_anterior

                  const formula = fees.find(range =>
                     range['mínimo'] <= consumo && consumo <= (range['máximo'] ?? 1000000)
                  )
                  ['fórmula']

                  const cargo = new Function('consumo', `return ${formula}`)

                  field.textContent = cargo(consumo).toFixed(2)
                  break

               case 'multa':
                  field.textContent = 1.15
                  break

            }
         }

         const article = document.createElement('article')
         const hr = document.createElement('hr')
         article.append(new_receipt, hr, new_receipt.cloneNode(true))
         receipts_container.append(article)
      }
   }

}, { passive: true })

add_meter_b.addEventListener('click', () => {

   if (typeof receipt.next === 'number')
   {
      fill_datalist(caseríos_datalist, 'caserío')
      new_meter_f.parentElement.showModal()
      return
   }

   // initial_date.value = new Date().toLocaleDateString('en-ca')
   num_recibo_f.parentElement.showModal()

}, { passive: true })

num_recibo_f.addEventListener('submit', submit_ev => {

   const first = getFormData(submit_ev.target).first_receipt
   receipt = { first, next: first }

   localStorage.setItem('receipt', JSON.stringify(receipt))

   num_first_receipt.textContent = receipt.first
   num_next_receipt.textContent = receipt.next

}, { passive: true })

new Show_Btn(help_section_b, user_guide, help_search)

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

   const sin_lectura_actual = typeof matching_meter.lectura_actual !== 'number'

   if (sin_lectura_actual)
   {
      if (matching_meter.desde >= form_data.hasta)
      {
         err_desde_hasta_f.parentElement.showModal()
         return
      }

      if (matching_meter.lectura_anterior > form_data.lectura_actual)
      {
         err_lecturas.parentElement.showModal()
         return
      }

      matching_meter.lectura_actual = form_data.lectura_actual
      matching_meter.hasta = form_data.hasta
      matching_meter.recibo = new_receipt()


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
      if (matching_meter.hasta >= form_data.hasta)
      {
         err_desde_hasta_f.parentElement.showModal()
         return
      }

      if (matching_meter.lectura_actual > form_data.lectura_actual)
      {
         err_lecturas.parentElement.showModal()
         return
      }

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
            hasta: form_data.medidor === medidor ? form_data.hasta : undefined,
            recibo: form_data.medidor === medidor ? new_receipt() : undefined
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

print_all_b.addEventListener('click', () => {

   if (meters.current.data.some(row => row.recibo === undefined))
   {
      no_print_f.parentElement.showModal()
   }
   else
   {
      print()
   }
})

// const consumo = 20
// const formula = fees.find(row => row.mínimo >= consumo && (row.máximo ?? Number.MAX_SAFE_INTEGER) <= consumo)
// console.log(eval(formula))

//* FUNCTIONS:

function cell_options() {

   const tbody = meters_table.tBodies[0]

   tbody.addEventListener('click', click_ev => {

      const cell_text = click_ev.target.textContent
      const row_cells = Array.from(click_ev.target.parentElement.cells)

      const row_text = row_cells
         .map(cell => cell.textContent)
         .join(' ')

      const data_class = click_ev.target.getAttribute('data-class')

      const medidor = row_cells
         .find(cell => cell.getAttribute('data-class') === 'medidor')
         .getAttribute('data-value')

      const data_row = meters.current.data.find(row => row.medidor === medidor)

      cell_options_f.addEventListener('submit', submit_ev => {

         switch (submit_ev.submitter.name)
         {
            case 'copy-cell':
               navigator.clipboard.writeText(cell_text)
               break
            case 'copy-row':
               navigator.clipboard.writeText(row_text)
               break
            case 'edit-cell':
               switch (data_class)
               {
                  case 'medidor':

                  case 'zona':
                  case 'titular':
                  case 'caserio':
                  case 'lectura_anterior':
                  case 'desde':
                  case 'lectura_actual':
                  case 'hasta':
                  case 'recibo':
               }
               break
            case 'print-cell':
               break
         }

      }, { passive: true })

      cell_options_f.parentElement.showModal()

   }, { passive: true })
}

function fill_fees_table(col_order) {

   fees_table.textContent = ''

   const caption = fees_table.createCaption()
   const sup = document.createElement('sup')
   sup.textContent = 3
   caption.append(document.createTextNode('Fórmulas según el consumo en m'), sup)

   const thead_row = fees_table.createTHead().insertRow()

   for (const col of col_order)
   {
      const th = document.createElement('th')
      th.setAttribute('data-class', remove_diacritics(col).replaceAll(' ', '-'))
      th.setAttribute('data-row-order', 'default')
      th.textContent = col.replaceAll('_', ' ')
      thead_row.appendChild(th)
   }

   const tbody = fees_table.createTBody()

   for (const row_data of fees)
   {
      const tr = tbody.insertRow()

      for (const col of col_order)
      {
         const td = tr.insertCell()
         td.setAttribute('data-class', remove_diacritics(col).replaceAll(' ', '-'))

         const datum = row_data[col]
         td.setAttribute('data-value', datum)
         td.textContent = datum
      }
   }
}

function th_sort_meters() {

   const THs = meters_table.tHead.rows[0]?.children
   const tbody = meters_table.tBodies[0]
   const rows = Array.from(tbody.rows)

   const data_types = { medidor: 'string', zona: 'number', titular: 'string', caserio: 'string', lectura_anterior: 'number', desde: 'number', lectura_actual: 'number', hasta: 'number', recibo: 'number' }

   for (const th of THs)
   {
      th.setAttribute('data-row-order', 'default')

      const col = th.getAttribute('data-class')
      const col_data_type = data_types[col]

      if (col_data_type === 'number')
      {
         th.addEventListener('click', () => {

            if (th.getAttribute('data-row-order') === 'ascending')
            {
               th.setAttribute('data-row-order', 'descending')
            } else
            {
               th.setAttribute('data-row-order', 'ascending')
            }

            rows.sort((row_a, row_b) => {

               let num_a = Number(Array
                  .from(row_a.cells)
                  .find(cell => cell.getAttribute('data-class') === col)
                  .getAttribute('data-value'))


               let num_b = Number(Array
                  .from(row_b.cells)
                  .find(cell => cell.getAttribute('data-class') === col)
                  .getAttribute('data-value'))

               if (isNaN(num_a)) num_a = 0
               if (isNaN(num_b)) num_b = 0

               return th.getAttribute('data-row-order') === 'ascending' ? num_a - num_b : num_b - num_a
            })

            tbody.textContent = ''
            tbody.append(...rows)
         })
      } else if (col_data_type === 'string')
      {
         th.addEventListener('click', () => {

            if (th.getAttribute('data-row-order') === 'ascending')
            {
               th.setAttribute('data-row-order', 'descending')
            } else
            {
               th.setAttribute('data-row-order', 'ascending')
            }

            rows.sort((row_a, row_b) => {

               let str_a = Array
                  .from(row_a.cells)
                  .find(cell => cell.getAttribute('data-class') === col)
                  .getAttribute('data-value')

               let str_b = Array
                  .from(row_b.cells)
                  .find(cell => cell.getAttribute('data-class') === col)
                  .getAttribute('data-value')

               str_a = str_a ? str_a.toLowerCase() : ''
               str_b = str_b ? str_b.toLowerCase() : ''

               if (str_a < str_b) return th.getAttribute('data-row-order') === 'ascending' ? -1 : 1
               if (str_a > str_b) return th.getAttribute('data-row-order') === 'ascending' ? 1 : -1

               return 0
            })

            tbody.textContent = ''
            tbody.append(...rows)
         })
      }
   }
}

function new_receipt() {

   const current_receipt = receipt.next
   num_next_receipt.textContent = ++receipt.next
   localStorage.setItem('receipt', JSON.stringify(receipt))
   return current_receipt
}

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

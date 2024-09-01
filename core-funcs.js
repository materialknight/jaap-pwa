'use strict'

export { Show_Btn, insert_switches, fill_table, filter_input, handle_db_err, remove_diacritics }

class Show_Btn {

   static instances = []

   constructor(show_btn, table, searchbox) {

      this.show_btn = show_btn
      this.table = table
      this.searchbox = searchbox

      this.show_btn.addEventListener('click', () => {

         for (const instance of this.constructor.instances)
         {
            if (instance === this)
            {
               instance.show_btn.classList.add('active-section')
               instance.table.hidden = false
               instance.searchbox.hidden = false
               continue
            }

            instance.show_btn.classList.remove('active-section')
            instance.table.hidden = true
            instance.searchbox.hidden = true
         }

      }, { passive: true })

      this.constructor.instances.push(this)
   }
}

function insert_switches(switchBox, table, def_col_order) {

   switchBox.textContent = ''

   for (const col of def_col_order)
   {
      const controlled_class = remove_diacritics(col).replaceAll(' ', '-').toLowerCase()

      // Below, Math.random() is necessary because otherwise, if 2 tables in the DOM had a column with the same name, their corresponding switches would have the same id, which will cause undefined behavior!

      const id = controlled_class.concat(Math.random())
      const checkbox = document.createElement('input')

      checkbox.setAttribute('type', 'checkbox')
      checkbox.setAttribute('checked', '')
      checkbox.setAttribute('id', id)
      checkbox.setAttribute('data-class', controlled_class)

      checkbox.addEventListener('change', change_ev => {

         const controlled_class = change_ev.target.getAttribute('data-class')
         const column = table.querySelectorAll(`[data-class=${controlled_class}]`)

         for (const td of column)
         {
            td.hidden = td.hidden ? false : true
         }

      }, { passive: true })

      const label = document.createElement('label')

      label.setAttribute('for', id)
      label.textContent = col.replaceAll('_', ' ')

      switchBox.append(checkbox, label)
   }
}

function th_sort_meters(table) {

   const THs = table.getElementsByTagName('th')
   const tbody = table.tBodies[0]
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

            const row_order_ascending = th.getAttribute('data-row-order') === 'ascending'

            if (row_order_ascending)
            {
               th.setAttribute('data-row-order', 'descending')
            } else
            {
               th.setAttribute('data-row-order', 'ascending')
            }

            rows.sort((row_a, row_b) => {

               const num_a = Number(Array
                  .from(row_a.cells)
                  .find(cell => cell.getAttribute('data-class') === col)
                  .textContent)

               const num_b = Number(Array
                  .from(row_b.cells)
                  .find(cell => cell.getAttribute('data-class') === col)
                  .textContent)

               return row_order_ascending ? num_a[col] - num_b[col] : num_b[col] - num_a[col]
            })

            tbody.textContent = ''
            tbody.append(...rows)
         })
      } else if (col_data_type === 'string')
      {
         th.addEventListener('click', () => {

            const row_order_ascending = th.getAttribute('data-row-order') === 'ascending'

            if (row_order_ascending)
            {
               th.setAttribute('data-row-order', 'descending')
            } else
            {
               th.setAttribute('data-row-order', 'ascending')
            }

            rows.sort((row_a, row_b) => {

               const str_a = Array
                  .from(row_a.cells)
                  .find(cell => cell.getAttribute('data-class') === col)
                  .textContent
                  .toLowerCase()

               const str_b = Array
                  .from(row_b.cells)
                  .find(cell => cell.getAttribute('data-class') === col)
                  .textContent
                  .toLowerCase()

               if (str_a < str_b) return row_order_ascending ? -1 : 1
               if (str_a > str_b) return row_order_ascending ? 1 : -1

               return 0
            })

            tbody.textContent = ''
            tbody.append(...rows)
         })
      }
   }
}

function fill_table(table, table_data, col_order) {

   table.textContent = ''

   const thead_row = table.createTHead().insertRow()

   for (const col of col_order)
   {
      const th = document.createElement('th')
      th.setAttribute('data-class', remove_diacritics(col).replaceAll(' ', '-'))
      th.setAttribute('data-row-order', 'default')
      th.textContent = col.replaceAll('_', ' ')
      thead_row.appendChild(th)
   }

   const tbody = table.createTBody()

   for (const row_data of table_data)
   {
      const tr = tbody.insertRow()

      for (const col of col_order)
      {
         const td = tr.insertCell()
         td.setAttribute('data-class', remove_diacritics(col).replaceAll(' ', '-'))

         let datum = row_data[col]
         td.setAttribute('data-value', datum)

         const datum_as_date = new Date(datum)
         const datum_is_date = typeof datum === 'number' && datum.toString().length === 13 && !isNaN(datum_as_date)

         if (datum_is_date)
         {
            datum = datum_as_date.toLocaleDateString('es', {
               day: 'numeric',
               year: 'numeric',
               month: 'short',
               timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            })
         }

         td.textContent = datum
      }
   }
}

function filter_input(table, input_ev) {

   const sought_val = remove_diacritics(input_ev.target.value).toLowerCase()
   const tbody = table.tBodies[0]

   if (!tbody)
   {
      return
   }

   for (const row of tbody.rows)
   {
      const row_text = remove_diacritics(
         Array
            .from(row.cells)
            .map(cell => cell.textContent)
            .join(' ')
      )
         .toLowerCase()

      row.hidden = row_text.includes(sought_val) ? false : true
   }
}

function handle_db_err(err) {
   console.error(err)
   alert('Ha ocurrido un error, abra la consola para más detalles!')
}

function remove_diacritics(str) {

   return str.replaceAll(/[áéíóúñ]/g, char => {

      switch (char)
      {
         case 'á': return 'a'
         case 'é': return 'e'
         case 'í': return 'i'
         case 'ó': return 'o'
         case 'ú': return 'u'
         case 'ñ': return 'n'
         case 'Á': return 'A'
         case 'É': return 'E'
         case 'Í': return 'I'
         case 'Ó': return 'O'
         case 'Ú': return 'U'
         case 'Ñ': return 'N'
      }
   })
}

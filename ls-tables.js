'use strict'

import { csvParse } from 'https://cdn.jsdelivr.net/npm/d3-dsv@3/+esm'

class LocalStorageTable {

   static instances = []

   constructor(storageKey = null, defaultOrder = null, hideClass = 'd-none') {

      if (storageKey)
      {
         this.storageKey = storageKey
      }

      this.data = JSON.parse(localStorage.getItem(storageKey)) ?? []
      this.defaultOrder = defaultOrder

      this.table = null
      this.columnSwitchesContainer = null
      this.filterContainer = null

      this.hideClass = hideClass

      this.constructor.instances.push(this)
   }

   linkTable(table) {

      this.table = table
      return this
   }

   linkColumnSwitchesContainer(columnSwitchesContainer) {

      this.columnSwitchesContainer = columnSwitchesContainer
      return this
   }

   linkFilterContainer(filterContainer) {

      this.filterContainer = filterContainer
      return this
   }

   insertRows() {

      if (!this.table)
      {
         throw "You must use linkTable before insertRows!"
      }

      this.table.textContent = ''

      return this._THead()._TBody()
   }

   _THead() {

      const tHeadRow = this.table.createTHead().insertRow()

      for (const col of this.defaultOrder)
      {
         const th = document.createElement('th')

         th.className = this
            ._removeDiacritics(col)
            .replaceAll(' ', '-')
            .toLowerCase()

         th.textContent = col
         tHeadRow.appendChild(th)
      }

      return this
   }

   _TBody() {

      const tBody = this.table.createTBody()

      for (const row of this.data)
      {
         const tBodyRow = tBody.insertRow()

         for (const col of this.defaultOrder)
         {
            const td = tBodyRow.insertCell()

            td.className = this
               ._removeDiacritics(col)
               .replaceAll(' ', '-')
               .toLowerCase()

            td.textContent = Array.isArray(row)
               ? row[this.defaultOrder.indexOf(col)]
               : row[col]
         }
      }

      return this
   }

   insertColumnSwitches() {

      if (!this.defaultOrder)
      {

         if (this.data.length === 0)
         {
            throw "You must load data (when calling the LocalStorageTable constructor or with loadCsv) or define a default column order (when calling the LocalStorageTable constructor) before using insertColumnSwitches!"
         }

         this.defaultOrder = Object.keys(this.data[0])
      }

      for (const col of this.defaultOrder)
      {
         const controlledClass = this
            ._removeDiacritics(col)
            .replaceAll(' ', '-')
            .toLowerCase()

         // Below, Math.random() is necessary because otherwise, if 2 tables have a column with the same name, their corresponding switches would have the same id, which will cause undefined behavior!

         const id = controlledClass.concat(Math.random())
         const input = document.createElement('input')

         input.setAttribute('type', 'checkbox')
         input.setAttribute('checked', '')
         input.setAttribute('id', id)
         input.setAttribute('data-class', controlledClass)

         input.addEventListener('change', changeEv => {

            const controlledClass = changeEv.target.getAttribute('data-class')
            const column = this.table.querySelectorAll('.'.concat(controlledClass))

            for (const td of column)
            {
               td.classList.toggle(this.hideClass)
            }
         }, { passive: true })

         const label = document.createElement('label')

         label.setAttribute('for', id)
         label.textContent = col

         this.columnSwitchesContainer.append(input, label)
      }

      return this
   }

   filter(inputOrChangeEv) {

      const soughtVal = this
         ._removeDiacritics(inputOrChangeEv.target.value)
         .toLowerCase()

      for (const row of this.table.rows)
      {
         const rowText = this
            ._removeDiacritics(row.textContent)
            .toLowerCase()

         if (rowText.includes(soughtVal))
         {
            row.classList.remove(this.hideClass)
         }
         else
         {
            row.classList.add(this.hideClass)
         }
      }
   }

   save(row) {

      this.data.push(row)
      localStorage.setItem(this.storageKey, JSON.stringify(this.data))
      return this
   }

   show() {

      this.table?.classList.remove(this.hideClass)
      this.columnSwitchesContainer?.classList.remove(this.hideClass)
      this.filterContainer?.classList.remove(this.hideClass)

      for (const instance of this.constructor.instances)
      {
         if (instance !== this)
         {
            instance.table?.classList.add(this.hideClass)
            instance.columnSwitchesContainer?.classList.add(this.hideClass)
            instance.filterContainer?.classList.add(this.hideClass)
         }
      }
   }

   styleColumnSwitches(inputStyle = 'btn-check', labelStyle = 'btn btn-outline-danger') {

      if (this.columnSwitchesContainer.children.length === 0)
      {
         throw "You must use insertColumnSwitches before styleColumnSwitches!"
      }

      for (const elem of this.columnSwitchesContainer.children)
      {
         if (elem.tagName === 'INPUT')
         {
            elem.classList.add(...inputStyle.split(' '))
         }
         else
         {
            elem.classList.add(...labelStyle.split(' '))
         }
      }

      return this
   }

   loadCsv(readerLoadedFile) {

      this.data = csvParse(readerLoadedFile)
      delete this.data['columns']

      this.defaultOrder = Object.keys(this.data[0])

      return this
   }

   formatDates(lang = 'es', dateOptions = {
      day: 'numeric',
      year: 'numeric',
      month: 'short',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
   }) {

      const tBodyRows = this.table.tBodies[0]?.rows

      if (tBodyRows.length === 0)
      {
         console.warn("No dates were formatted!")
         return this
      }

      for (const row of tBodyRows)
      {
         for (const cell of row.cells)
         {
            if (cell.textContent.length !== 13)
            {
               continue
            }

            const date = new Date(Number(cell.textContent))
            const dateValid = !isNaN(date)

            if (dateValid)
            {
               cell.textContent = date.toLocaleDateString(lang, dateOptions)
            }
         }
      }

      return this
   }

   _removeDiacritics(str) {

      return str.replaceAll(/[áéíóúñ]/g, char => {

         switch (char)
         {
            case 'á': return 'a'
            case 'é': return 'e'
            case 'í': return 'i'
            case 'ó': return 'o'
            case 'ú': return 'u'
            case 'ñ': return 'n'
         }
      })
   }
}

function getFormData(form) {

   const formData = {}

   for (const elem of form.elements)
   {
      const { name, id, type, value } = elem

      switch (type)
      {
         case 'date':
         case 'datetime-local':
         case 'month':

            const date = new Date(value)

            // When a date like '2024-08-04' is passed to the Date constructor, the Date constructor assumes it is in UTC at midnight, therefore, if your timezone is not UTC, and you use the Intl object or date.toLocaleDateString to display the date in your timezone, you'll get a datetime that is some hours behind or ahead '04 Aug 2024 00:00:00 GMT' (depending on whether your timezone's offset from UTC is negative or positive).

            // For example, if your timezone is 'America/El_Salvador' (which is 6 hours behind UTC), and you do:

            // new Date('2024-08-04').toLocaleString()

            // That will return '8/3/2024, 6:00:00 PM', which is 6 hours behind the date given to the Date constructor.

            // The solution is to add the offset before saving the date, like so:

            date.setMinutes(date.getMinutes() + date.getTimezoneOffset())
            formData[name ? name : id] = date.valueOf()
            break

         case 'number':
         case 'range':

            formData[name ? name : id] = Number(value)
            break

         case 'text':

            formData[name ? name : id] = value.trim()
            break

         default: formData[name ? name : id] = value
      }
   }

   return formData
}

export { LocalStorageTable, getFormData }

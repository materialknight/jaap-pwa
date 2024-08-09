'use strict'

import { csvParse } from 'https://cdn.jsdelivr.net/npm/d3-dsv@3/+esm'

class LocalStorageTable {

   static instances = []
   static removeDiacritics(str) {

      // Used by #_createTHead(), #_createTBodies(), #_createBodyTR() insertSwitches() and filter()

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

   constructor(storageKey = null, defaultOrder = null) {

      this.storageKey = storageKey
      this.history = JSON.parse(localStorage.getItem(storageKey)) ?? [[]]
      this.defaultOrder = defaultOrder

      this.table = null
      this.switchBox = null
      this.filterBox = null

      // Used by #_formatDates() and #_formatTRDates():

      this.dateOptions = [
         'es',
         {
            day: 'numeric',
            year: 'numeric',
            month: 'short',
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
         }
      ]

      this.constructor.instances.push(this)
   }

   linkTable(table) {

      this.table = table
      return this
   }

   linkSwitchBox(columnSwitchesContainer) {

      this.switchBox = columnSwitchesContainer
      return this
   }

   linkFilterBox(filterBox) {

      this.filterBox = filterBox
      return this
   }

   setDateOptions(lang, dateOptions) {

      this.dateOptions = [lang, dateOptions]
   }

   fillTable() {

      this.table.textContent = ''
      this.defaultOrder ??= Object.keys(this.history[0])

      return this.#_createTHead().#_createTBodies().#_formatDates()
   }

   insertSwitches() {

      this.switchBox.textContent = ''
      this.defaultOrder ??= Object.keys(this.history[0])

      for (const col of this.defaultOrder)
      {
         const controlledClass = this.constructor
            .removeDiacritics(col)
            .replaceAll(' ', '-')
            .toLowerCase()

         // Below, Math.random() is necessary because otherwise, if 2 tables have a column with the same name, their corresponding switches would have the same id, which will cause undefined behavior!

         const id = controlledClass.concat(Math.random())
         const checkbox = document.createElement('input')

         checkbox.setAttribute('type', 'checkbox')
         checkbox.setAttribute('checked', '')
         checkbox.setAttribute('id', id)
         checkbox.setAttribute('data-class', controlledClass)

         checkbox.addEventListener('change', changeEv => {

            const controlledClass = changeEv.target.getAttribute('data-class')
            const column = this.table.querySelectorAll('.'.concat(controlledClass))

            for (const td of column)
            {
               td.hidden = td.hidden ? false : true
            }
         }, { passive: true })

         const label = document.createElement('label')

         label.setAttribute('for', id)
         label.textContent = col

         this.switchBox.append(checkbox, label)
      }

      return this
   }

   filter(inputOrChangeEv) {

      if (!this.filterBox)
      {
         throw "You must use linkFilterBox() before this function."
      }

      const soughtVal = this.constructor
         .removeDiacritics(inputOrChangeEv.target.value)
         .toLowerCase()

      for (const row of this.table.rows)
      {
         const rowText = this.constructor
            .removeDiacritics(row.textContent)
            .toLowerCase()

         if (rowText.includes(soughtVal))
         {
            row.hidden = false
         }
         else
         {
            row.hidden = true
         }
      }
   }

   save() {

      if (!this.storageKey)
      {
         throw "You can't save a table's data if you didn't provide a storage key when you called the LocalStorageTable constructor"
      }

      localStorage.setItem(this.storageKey, JSON.stringify(this.history))

      this.fillTable()

      if (!this.table.hidden)
      {
         this.show()
      }
   }



   show(onlyOne = true, index = 0) {

      if (this.table)
      {
         this.table.hidden = false

         for (const tBody of this.table.tBodies)
         {
            tBody.hidden = onlyOne
         }

         if (onlyOne && this.table.tBodies[index])
         {
            this.table.tBodies[index].hidden = false
         }
      }

      if (this.switchBox)
      {
         this.switchBox.hidden = false
      }

      if (this.filterBox)
      {
         this.filterBox.hidden = false
      }

      for (const instance of this.constructor.instances)
      {
         if (instance !== this)
         {
            if (instance.table)
            {
               instance.table.hidden = true
            }

            if (instance.switchBox)
            {
               instance.switchBox.hidden = true
            }

            if (instance.filterBox)
            {
               instance.filterBox.hidden = true
            }
         }
      }
   }

   styleSwitches(checkboxCSSClasses = 'btn-check', labelCSSClasses = 'btn btn-outline-danger') {

      if (this.switchBox.children.length === 0)
      {
         throw "You must use insertSwitches() before this function!"
      }

      for (const elem of this.switchBox.children)
      {
         if (elem.tagName === 'INPUT')
         {
            elem.classList.add(...checkboxCSSClasses.split(' '))
         }
         else
         {
            elem.classList.add(...labelCSSClasses.split(' '))
         }
      }

      return this
   }

   loadCsv(readerLoadedFile) {

      this.history[0] = csvParse(readerLoadedFile)
      delete this.history[0]['columns']

      this.defaultOrder ??= Object.keys(this.history[0][0])

      return this
   }

   #_formatTRDates(row) {

      // Used by formatDates(), saveNewRow() and a submit listener in index.js.

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
            cell.textContent = date.toLocaleDateString(...this.dateOptions)
         }
      }
   }

   #_formatDates() {

      // Used by fillTable().

      for (const tBody of this.table.tBodies)
      {
         const tBodyRows = tBody.rows

         if (tBodyRows.length === 0)
         {
            console.warn("No dates were formatted!")
            return this
         }

         for (const row of tBodyRows)
         {
            this.#_formatTRDates(row)
         }
      }

      return this
   }

   #_createTHead() {

      // Used by fillTable()

      const tHeadRow = this.table.createTHead().insertRow()

      for (const col of this.defaultOrder)
      {
         const th = document.createElement('th')

         th.className = this.constructor
            .removeDiacritics(col)
            .replaceAll(' ', '-')
            .toLowerCase()

         th.textContent = col
         tHeadRow.appendChild(th)
      }

      return this
   }

   #_createTBodies() {

      // Used by fillTable().

      for (const tableData of this.history)
      {
         const tBody = this.table.createTBody()

         for (const rowData of tableData)
         {
            this.#_createBodyTR(tBody, rowData)
         }
      }

      return this
   }

   #_createBodyTR(tBody, rowData) {

      // Used by #_createTBodies(), saveNewRow() and a submit listener in index.js.

      const tr = tBody.insertRow()

      for (const col of this.defaultOrder)
      {
         const td = tr.insertCell()

         td.className = this.constructor
            .removeDiacritics(col)
            .replaceAll(' ', '-')
            .toLowerCase()

         td.textContent = Array.isArray(rowData)
            ? rowData[this.defaultOrder.indexOf(col)]
            : rowData[col]
      }

      return tr
   }
}

export { LocalStorageTable }

'use strict'

import { csvParse, csvFormat } from 'https://cdn.jsdelivr.net/npm/d3-dsv@3/+esm'

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
            case 'Á': return 'A'
            case 'É': return 'E'
            case 'Í': return 'I'
            case 'Ó': return 'O'
            case 'Ú': return 'U'
            case 'Ñ': return 'N'
         }
      })
   }

   constructor(storageKey = null, defaultOrder = null) {

      this.storageKey = storageKey
      this.history = JSON.parse(localStorage.getItem(storageKey)) ?? [[]]
      this.defaultOrder = defaultOrder

      this.table = null
      this.searchBox = null
      this.hasFilter = false

      this.historySelect = null
      this.csvDownload = null

      this.visibleTBodyIndex = 0

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

      if (this.table)
      {
         console.warn("linkTable() should only be called once per LocalStorageTable!")
         return this
      }

      this.table = table
      return this
   }

   linkHistorySelect(historySelect) {

      if (this.historySelect)
      {
         console.warn("linkHistorySelect() should only be called once per LocalStorageTable!")
         return this
      }

      this.historySelect = historySelect

      this.historySelect.addEventListener(
         'change',
         changeEv => this.show(changeEv.currentTarget.value),
         { passive: true }
      )

      return this
   }

   linkCsvDownloadBtn(csvDownloadBtn) {

      if (this.csvDownload)
      {
         console.warn('linkDownloadBtn() should only be called once per LocalStorageTable!')
      }
      else
      {
         this.csvDownload = csvDownloadBtn

         this.csvDownload.addEventListener('click', () => {

            const csvDoc = csvFormat(this.history[this.visibleTBodyIndex])
            const link = document.createElement('a')

            link.href = URL.createObjectURL(new Blob(
               [csvDoc],
               { type: 'text/csv', endings: 'native' }
            ))

            link.download = 'tabla.csv'
            link.click()
            URL.revokeObjectURL(link.href)

         }, { passive: true })
      }

      return this
   }

   #_insertHistoryOptions() {

      // Used by fillTable().

      if (!this.historySelect)
      {
         console.warn('No history <option>s were inserted because no <select> element is linked!')
         return this
      }

      this.historySelect.textContent = ''

      for (let i = 0; i < this.history.length; ++i)
      {
         const option = document.createElement('option')
         option.value = i
         option.textContent = this.history.length - i
         this.historySelect.append(option)
      }

      return this
   }

   linkFilter(filter) {

      if (this.hasFilter)
      {
         console.warn("linkFilter() should only be called once per LocalStorageTable!")
         return this
      }

      this.hasFilter = true

      filter.addEventListener(
         'input',
         inputEv => this.#_filter(inputEv),
         { passive: true }
      )

      return this
   }

   linkSearchBox(searchBox) {

      if (this.searchBox)
      {
         console.warn("linkSearchBox() should only be called once per LocalStorageTable!")
         return this
      }

      this.searchBox = searchBox
      return this
   }

   setDateOptions(lang, dateOptions) {

      this.dateOptions = [lang, dateOptions]
   }

   fillTable() {

      this.table.textContent = ''
      this.defaultOrder ??= Object.keys(this.history[0][0])

      if (this.historySelect)
      {
         this.#_insertHistoryOptions()
      }

      return this.#_createTHead().#_createTBodies().#_formatDates()
   }

   insertSwitches(switchBox) {

      switchBox.textContent = ''
      this.defaultOrder ??= Object.keys(this.history[0][0])

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

         switchBox.append(checkbox, label)
      }

      return this
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

   show(index) {

      if (index)
      {
         this.visibleTBodyIndex = index
      }

      if (this.table)
      {
         this.table.hidden = false

         for (const tBody of this.table.tBodies)
         {
            tBody.hidden = true
         }

         this.table.tBodies[this.visibleTBodyIndex].hidden = false
      }

      if (this.searchBox)
      {
         this.searchBox.hidden = false
      }

      for (const instance of this.constructor.instances)
      {
         if (instance !== this)
         {
            if (instance.table)
            {
               instance.table.hidden = true
            }

            if (instance.searchBox)
            {
               instance.searchBox.hidden = true
            }
         }
      }
   }

   loadCsv(readerLoadedFile) {

      this.history[0] = csvParse(readerLoadedFile)
      delete this.history[0]['columns']

      this.defaultOrder ??= Object.keys(this.history[0][0])

      return this
   }

   #_filter(inputOrChangeEv) {

      const soughtVal = this.constructor
         .removeDiacritics(inputOrChangeEv.target.value)
         .toLowerCase()

      for (const row of this.table.tBodies[this.visibleTBodyIndex].rows)
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

   #_formatTRDates(row) {

      // Used by #_formatDates().

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

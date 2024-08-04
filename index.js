'use strict'

import { csvParse } from 'https://cdn.jsdelivr.net/npm/d3-dsv@3/+esm'
import { LocalStorageTable, getFormData } from './ls-tables.js'

const metersBtn = document.getElementById('meters-btn')
// const meterSearch = document.getElementById('meter-search')
const meterAddBtn = document.getElementById('meter-add-btn')
const meterDialog = document.getElementById('meter-dialog')
const meterCancelBtn = document.getElementById('meter-cancel-btn')
// const metersTable = document.getElementById('meters-table')
// const metersSwitches = document.getElementById('meters-switches')
const meterErrorDialog = document.getElementById('meter-error-dialog')
const meterRepeated = document.getElementById('meter-repeated')
const meterFilter = document.getElementById('meter-filter')
const meterAddedDialog = document.getElementById('meter-added-dialog')

const csvBtn = document.getElementById('csv-btn')
// const csvTable = document.getElementById('csv-table')
// const csvSwitches = document.getElementById('csv-switches')
// const csvSearch = document.getElementById('csv-search')
const csvFilter = document.getElementById('csv-filter')

const meters = new LocalStorageTable('meters', [
   'medidor',
   'zona',
   'titular',
   'caserío',
   'lectura',
   'fecha'
])
   .linkTable(document.getElementById('meters-table'))
   .linkColumnSwitchesContainer(document.getElementById('meters-switches'))
   .linkFilterContainer(document.getElementById('meter-search'))
   .insertColumnSwitches()
   .styleColumnSwitches()
   .insertRows()
   .formatDates()

const csv = new LocalStorageTable()
   .linkTable(document.getElementById('csv-table'))
   .linkColumnSwitchesContainer(document.getElementById('csv-switches'))
   .linkFilterContainer(document.getElementById('csv-search'))

// Event listeners:

metersBtn.addEventListener(
   'click',
   () => meters.show(),
   { passive: true }
)

meterAddBtn.addEventListener(
   'click',
   () => meterDialog.showModal(),
   { passive: true }
)

meterCancelBtn.addEventListener(
   'click',
   () => meterDialog.close(),
   { passive: true }
)

meterFilter.addEventListener(
   'input',
   inputEv => meters.filter(inputEv),
   { passive: true }
)

meterDialog.addEventListener('submit', submitEv => {

   const formData = getFormData(submitEv, true)

   const meter = formData['medidor']

   if (meters.data.some(row => meter === row['medidor']))
   {
      meterRepeated.textContent = meter
      meterErrorDialog.showModal()
      return
   }

   // Convert date and number fields to numbers:

   formData['medidor'] = Number(formData['medidor'])
   formData['zona'] = Number(formData['zona'])
   formData['lectura'] = Number(formData['lectura'])

   const date = new Date(formData['fecha'])

   date.setMinutes(date.getMinutes() - date.getTimezoneOffset())

   formData['fecha'] = date.valueOf()

   meters
      .save(formData)
      .insertRows()
      .formatDates()

   meterAddedDialog.showModal()
})

csvBtn.addEventListener('change', changeEv => {

   const file = changeEv.currentTarget.files[0]

   if (!file)
   {
      return
   }

   const reader = new FileReader()

   reader.onload = function (loadEv) {

      csv
         .loadCsv(loadEv.target.result)
         .insertRows()
         .insertColumnSwitches()
         .styleColumnSwitches()
         .formatDates()
         .show()


   }

   reader.readAsText(file)
})

csvFilter.addEventListener(
   'input',
   inputEv => csv.filter(inputEv),
   { passive: true }
)
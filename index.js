'use strict'

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
   console.error('Service Workers are not supported by your browser.')
}

import { LocalStorageTable, getFormData } from './ls-tables.js'

const metersBtn = document.getElementById('meters-btn')
const meterAddBtn = document.getElementById('meter-add-btn')
const meterDialog = document.getElementById('meter-dialog')
const meterCancelBtn = document.getElementById('meter-cancel-btn')
const meterErrorDialog = document.getElementById('meter-error-dialog')
const meterRepeated = document.getElementById('meter-repeated')
const meterFilter = document.getElementById('meter-filter')
const meterAddedDialog = document.getElementById('meter-added-dialog')

const readingBtn = document.getElementById('reading-btn')
const readingDialog = document.getElementById('reading-dialog')
const readingCancelBtn = document.getElementById('reading-cancel-btn')
const readingConfirmDialog = document.getElementById('read-confirm-dialog')
const readingErrorDialog = document.getElementById('meter-non-existant-dialog')
const nonExistantMeter = document.getElementById('non-existant-meter')

const csvBtn = document.getElementById('csv-btn')
const csvFilter = document.getElementById('csv-filter')

const meters = new LocalStorageTable(
   'meters',
   [
      'medidor',
      'zona',
      'titular',
      'caserío',
      'lectura',
      'fecha'
   ]
)
   .linkTable(document.getElementById('meters-table'))
   .linkSwitchBox(document.getElementById('meters-switches'))
   .linkFilterBox(document.getElementById('meter-search'))
   .insertSwitches()
   .styleSwitches()
   .fillTable()

let csv = new LocalStorageTable()
   .linkTable(document.getElementById('csv-table'))
   .linkSwitchBox(document.getElementById('csv-switches'))
   .linkFilterBox(document.getElementById('csv-search'))

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

   const formData = getFormData(submitEv.target, ['medidor'])

   // Feature deleted here: Title case the name of the payer and the name of the caserío.

   if (meters.history[0].some(row => formData['medidor'] === row['medidor']))
   {
      meterRepeated.textContent = formData['medidor']
      meterErrorDialog.showModal()
      return
   }

   meters.saveNewRow(formData)
   meterAddedDialog.showModal()

}, { passive: true })

readingBtn.addEventListener(
   'click',
   () => readingDialog.showModal(),
   { passive: true }
)

readingCancelBtn.addEventListener(
   'click',
   () => readingDialog.close(),
   { passive: true }
)

readingDialog.addEventListener('submit', submitEv => {

   const readData = getFormData(submitEv.target, ['medidor'])

   // Check if the meter is already registered in the top (last) table body:

   const matchingRow = meters.history[0].find(row => readData['medidor'] === row['medidor'])

   if (!matchingRow)
   {
      nonExistantMeter.textContent = readData['medidor']
      readingErrorDialog.showModal()
      return
   }

   // If the meter has no corresponding 'fecha', register the form's reading and today's timestamp as its date:

   if (!matchingRow['fecha'])
   {
      matchingRow['lectura'] = readData['lectura']
      matchingRow['fecha'] = new Date().valueOf()
      meters.saveEdit()
      readingConfirmDialog.showModal()
      return
   }

   // When this function didn't return in the previous if-block (because the meter has a corresponding 'fecha'), check if all other rows of the top tbody also have a 'fecha'. If so, create a new tableData array to represent a new tbody (the new 'lectura' and 'fecha' columns will be empty, except for the row whose meter matches the one received from the user; that row will have the 'lectura' received from the form, and today's timestamp as its 'fecha'.

   // The saveNewTable() function will then prepend that data at the beginning of the history array, save the history in localStorage, and insert the new tbody (that corresponds to the newly added tableData) on top of the other tbodies:

   if (meters.history[0].every(row => row['fecha']))
   {
      const newTableData = meters.history[0].map(row => {

         const newTableRow = { ...row }

         if (newTableRow['medidor'] === readData['medidor'])
         {
            newTableRow['lectura'] = readData['lectura']
            newTableRow['fecha'] = new Date().valueOf()
         }
         else
         {
            newTableRow['lectura'] = null
            newTableRow['fecha'] = null
         }

      })

      meters.saveNewTable(newTableData)
      readingConfirmDialog.showModal()
   }

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
         .fillTable()
         .insertSwitches()
         .styleSwitches()
         .show()
   }

   reader.readAsText(file)

}, { passive: true })

csvFilter.addEventListener(
   'input',
   inputEv => csv.filter(inputEv),
   { passive: true }
)


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

import { LocalStorageTable } from './l-s-tables.js'
import { getFormData } from './form-data.js'

const select = document.getElementById('history')

const meterAddBtn = document.getElementById('meter-add-btn')
const meterDialog = document.getElementById('meter-dialog')
const meterErrorDialog = document.getElementById('meter-error-dialog')
const meterRepeated = document.getElementById('meter-repeated')
const meterFilter = document.getElementById('meter-filter')
const meterAddedDialog = document.getElementById('meter-added-dialog')

const readingBtn = document.getElementById('reading-btn')
const readingDialog = document.getElementById('reading-dialog')
const readingConfirmDialog = document.getElementById('read-confirm-dialog')
const readingErrorDialog = document.getElementById('meter-non-existant-dialog')
const nonExistantMeter = document.getElementById('non-existant-meter')
const readAlreadyDialog = document.getElementById('meter-already-read-dialog')
const alreadyReadMeter = document.querySelectorAll('.already-read-meter')

// To limit the min lectura to the previously-taken lectura {

const medidorBeingRead = document.getElementById('meter-being-read')
const lecturaInput = document.getElementById('meter-reading')

// }

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

select.addEventListener('change', changeEv => {

   const tBodyIndex = meters.table.tBodies.length - Number(changeEv.currentTarget.value)

   console.log(tBodyIndex)
   meters.show(true, tBodyIndex)
})

// Add every tBody as an <option> for the <select> element and trigger the above listener {:

for (let i = meters.table.tBodies.length; i > 0; --i)
{
   const option = document.createElement('option')
   option.value = i
   option.textContent = i
   select.append(option)
}

select.dispatchEvent(new Event('change'))

// }

// metersBtn.addEventListener(
//    'click',
//    () => meters.show(),
//    { passive: true }
// )

meterAddBtn.addEventListener(
   'click',
   () => meterDialog.showModal(),
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

   const topTBody = meters.history[0]

   if (topTBody.some(row => formData['medidor'] === row['medidor']))
   {
      meterRepeated.textContent = formData['medidor']
      meterErrorDialog.showModal()
      return
   }

   topTBody.push(formData)
   meters.save()
   meterAddedDialog.showModal()

}, { passive: true })

readingBtn.addEventListener(
   'click',
   () => readingDialog.showModal(),
   { passive: true }
)

readingDialog.addEventListener('submit', submitEv => {

   const { medidor, lectura } = getFormData(submitEv.target, ['medidor'])

   let topTBody = meters.history[0]
   const matchingRow = topTBody.find(row => medidor === row['medidor'])

   if (!matchingRow)
   {
      nonExistantMeter.textContent = medidor
      readingErrorDialog.showModal()
      return
   }

   if (!matchingRow['fecha'])
   {
      matchingRow['lectura'] = lectura
      matchingRow['fecha'] = new Date().valueOf()
      meters.save()
      readingConfirmDialog.showModal()
      return
   }

   // When this function didn't return in the previous if-block (because the meter has a corresponding 'fecha'), check if all other rows of the top tbody also have a 'fecha'. If so, create a new tableData array to represent a new tbody (the new 'lectura' and 'fecha' columns will be empty, except for the row whose meter matches the one received from the user; that row will have the 'lectura' received from the form, and today's timestamp as its 'fecha'.

   if (topTBody.every(row => row['fecha']))
   {
      const newTableData = topTBody.map(row => {

         const newTableRow = { ...row }

         if (newTableRow['medidor'] === medidor)
         {
            newTableRow['lectura'] = lectura
            newTableRow['fecha'] = new Date().valueOf()
         }
         else
         {
            newTableRow['lectura'] = null
            newTableRow['fecha'] = null
         }

         return newTableRow
      })

      meters.history.unshift(newTableData)
      meters.save()
      readingConfirmDialog.showModal()
   }
   else
   {
      for (const span of alreadyReadMeter)
      {
         span.textContent = medidor
      }

      readAlreadyDialog.showModal()
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

// To limit the min lectura to the previously-taken lectura {

medidorBeingRead.addEventListener('change', changeEv => {

   const medidor = changeEv.target.value
   const topTable = meters.history[0]

   const topTableMatchingRow = topTable.find(row => row['medidor'] === medidor)

   if (typeof topTableMatchingRow?.['lectura'] === 'number')
   {
      lecturaInput.min = topTableMatchingRow['lectura']
      return
   }

   const prevTable = meters.history[1]
   const prevTableMatchingRow = prevTable.find(row => row['medidor'] === medidor)

   if (typeof prevTableMatchingRow?.['lectura'] === 'number')
   {
      lecturaInput.min = prevTableMatchingRow['lectura']
   }
})

// }


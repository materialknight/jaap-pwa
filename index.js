'use strict'

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

   const formData = getFormData(submitEv.target)

   // Title case the name of the payer:

   formData['titular'] = formData['titular']
      .split(' ')
      .map(word => word[0].toUpperCase() + word.substring(1).toLowerCase())
      .join(' ')

   if (meters.data.some(row => medidor === row['medidor']))
   {
      meterRepeated.textContent = medidor
      meterErrorDialog.showModal()
      return
   }

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
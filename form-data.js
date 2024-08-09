'use strict'

export function getFormData(form, leaveUntouched) {

   const formData = {}

   for (const elem of form.elements)
   {
      const { name, id, type, value } = elem

      if (!name && !id)
      {
         continue
      }

      if (leaveUntouched?.includes(name) || leaveUntouched?.includes(id))
      {
         formData[name ? name : id] = value
         continue
      }

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
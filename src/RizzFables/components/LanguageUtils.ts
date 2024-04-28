import { RizzFables } from '../RizzFables'
import { Months } from './Types'

const source = RizzFables

export function convertDate(dateString: string): Date {
    // Parsed date string
    dateString = dateString.toLowerCase()

    // Month formats provided by the source
    const dateMonths: Months = source.dateMonths

    let date: Date | null = null
    Object.entries(dateMonths).forEach(([key, value]) => {
        if (dateString.toLowerCase().includes(value?.toLowerCase())) {
            date = new Date(dateString.replace(value, key ?? ''))
        }
    })

    if (!date || String(date) == 'Invalid Date') {
        console.log('Failed to parse chapter date! TO DEV: Please check if the entered months reflect the sites months')
        return new Date()
    }
    return date
}
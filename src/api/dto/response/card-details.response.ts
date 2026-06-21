export class CardDetailsResponse {
    status_code: number;
    status_msg: string;
    card: {
        id_number: string;
        sale_price: number;
        balance: number;
        currency: string;
        status: number;
        status_name: string;
        expire_date: string;
    }
}

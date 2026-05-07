import asyncio

from aiosend import CryptoPay

cp = CryptoPay(token="...")

async def main() -> int:
    invoice =  await cp.create_invoice(amount=5, asset="BTC")
    return invoice.invoice_id


asyncio.run(main())
    

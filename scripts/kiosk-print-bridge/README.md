# Kiosk Print Bridge

This folder contains a small local HTTP service for kiosk raw printing.

## What it does

- Accepts `POST /print`
- Receives a raw print payload from the kiosk app
- Acts as the handoff point for ESC/POS printing on the kiosk PC

## Run

```bash
node scripts/kiosk-print-bridge/server.js
```

## Environment

- `KIOSK_PRINT_HOST` defaults to `127.0.0.1`
- `KIOSK_PRINT_PORT` defaults to `8787`

## Endpoint contract

`POST /print`

```json
{
  "type": "escpos-print",
  "format": "raw",
  "job": {
    "queueNumber": "07142026-AM-P001",
    "serviceName": "Building Permit",
    "appointmentDate": "2026-07-14T00:00:00.000Z",
    "appointmentSlot": "Standard Office Hours",
    "dateGenerated": "2026-07-14T04:31:50.000Z",
    "ticketSizeMm": {
      "width": 80,
      "height": 125
    }
  }
}
```

## Next step

Replace the `handlePrintJob` stub in `server.js` with your chosen ESC/POS transport for the `w80` printer.

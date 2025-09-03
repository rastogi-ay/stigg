# Stigg Todo App
Solutions Engineer take-home assignment

## What I Built

A full-stack to-do list app that demonstrates Stigg's plans and feature management. The app includes:

### Core Features
- **Task Management**: Create, read, update, and delete tasks
- **Real-time Validation**: Character limits and usage counters
- **Dark Mode**: Toggle between light and dark themes
- **Responsive Design**: Clean, modern UI with CSS styling
- **Paywalls**: Simple custom paywalls prompting the user to upgrade

## ** Stigg Features **
- **Description Character Limit**: Configurable feature (default: 50 characters)
- **Hourly Task Limit**: Metered usage feature (default: 5 tasks/hour)
- **Total Task Limit**: Metered raw feature (default: 10 total tasks)
- **Dark Mode Access**: Boolean feature (default: true)

### Technical Architecture
- **Frontend**: React + TypeScript with Stigg React SDK
- **Backend**: FastAPI (Python) with Stigg Python SDK

## Setup Instructions

### Prerequisites
- Node.js (v16+)
- Python 3.8+
- Stigg account with API keys

### Environment Setup
Create `.env` files in both directories:

**Backend** (`/backend/.env`):
```
STIGG_SERVER_API_KEY=your_server_api_key
CUSTOMER_ID=your_customer_id  
FREE_PLAN_ID=your_free_plan_id
```

**Frontend** (`/frontend/.env`):
```
REACT_APP_STIGG_CLIENT_API_KEY=your_client_api_key
REACT_APP_CUSTOMER_ID=your_customer_id
```

**Note that the CUSTOMER_ID must be the same in the frontend and the backend!**

### Installation & Running

**Backend**:
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

**Frontend**:
```bash
cd frontend
npm install
npm start
```

The app will be available at `http://localhost:3000` with the backend running on `http://localhost:8000`.

## What I'd Do With More Time

- **Database Integration**: Replace in-memory storage with PostgreSQL/MongoDB
- **User Authentication**: Multi-tenant support with proper user management
- **Improved Syncing Between Stigg & App**: Add code to correctly align Stigg information with app


from app import create_app
import logging
import os

app = create_app()

if __name__ == '__main__':
    # Set up logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Get configuration
    debug = os.environ.get('FLASK_ENV') == 'development'
    port = int(os.environ.get('PORT', 5000))
    
    print("🚀 TrackSheets Backend Starting...")
    print(f"📍 Running on: http://localhost:{port}")
    print(f"🔧 Debug mode: {debug}")
    print(f"📁 Workbooks directory: {app.config['WORKBOOKS_DIR']}")
    print(f"🌐 CORS origins: {app.config['CORS_ORIGINS']}")
    
    # Run the application
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug
    )
#!/usr/bin/env python
"""Initialize the database with tables"""
from app import app, db, User, Portfolio

with app.app_context():
    # Create all tables
    db.create_all()
    print("✓ Database tables created successfully")
    
    # Check if we need sample data
    if User.query.first() is None:
        print("✓ Creating sample user for testing...")
        from flask_bcrypt import Bcrypt
        bcrypt = Bcrypt(app)
        
        hashed = bcrypt.generate_password_hash('password123').decode('utf-8')
        user = User(
            full_name='Test User',
            email='test@example.com',
            location='Nairobi',
            phone='+254712345678',
            username='testuser',
            password=hashed,
            is_verified=True
        )
        db.session.add(user)
        db.session.commit()
        print(f"✓ Sample user created: test@example.com")
    
    print("✓ Database initialization complete!")

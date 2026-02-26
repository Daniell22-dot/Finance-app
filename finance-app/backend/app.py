import os
import re
import secrets
import requests
import base64
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_marshmallow import Marshmallow
from marshmallow import Schema, fields, validate, ValidationError
from dotenv import load_dotenv
import logging
from logging.handlers import RotatingFileHandler
import random
from flask_migrate import Migrate

# Load environment variables
load_dotenv()
app = Flask(__name__)


# Validate required environment variables
required_env_vars = ['SECRET_KEY', 'DATABASE_URL', 'JWT_SECRET_KEY', 'SMTP_USERNAME', 'SMTP_PASSWORD']
missing_vars = [var for var in required_env_vars if not os.getenv(var)]

if missing_vars:
    raise EnvironmentError(f"Missing required environment variables: {', '.join(missing_vars)}")

# Initialize Flask app
app = Flask(__name__)
CORS(app)
# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///z10_group.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)


# Email Configuration
app.config['SMTP_SERVER'] = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
app.config['SMTP_PORT'] = int(os.getenv('SMTP_PORT', 587))
app.config['SMTP_USERNAME'] = os.getenv('SMTP_USERNAME')
app.config['SMTP_PASSWORD'] = os.getenv('SMTP_PASSWORD')
app.config['VERIFICATION_BASE_URL'] = os.getenv('VERIFICATION_BASE_URL', 'http://172.16.75.42:5000')
app.config['APP_NAME'] = 'Z10 GROUP'

# M-Pesa Configuration
app.config['MPESA_ENVIRONMENT'] = os.getenv('MPESA_ENVIRONMENT', 'sandbox')
app.config['MPESA_CONSUMER_KEY'] = os.getenv('MPESA_CONSUMER_KEY', '')
app.config['MPESA_CONSUMER_SECRET'] = os.getenv('MPESA_CONSUMER_SECRET', '')
app.config['MPESA_BUSINESS_SHORTCODE'] = os.getenv('MPESA_BUSINESS_SHORTCODE', '174379')
app.config['MPESA_PASSKEY'] = os.getenv('MPESA_PASSKEY', '')
app.config['MPESA_CALLBACK_URL'] = os.getenv('MPESA_CALLBACK_URL', 'http://172.16.75.42:5000/api/mpesa/callback')
app.config['UPLOAD_FOLDER'] = os.path.join(os.getcwd(), 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB limit

# Ensure upload folder exists
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])

# Initialize extensions
db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
migrate = Migrate(app, db)
# Configure CORS
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:19006", "http://localhost:19000", 
                    "http://10.0.2.2:19006", "http://10.0.2.2:5000",
                    "http://172.16.75.42:19006", "http://172.16.75.42:5000",
                    "exp://*"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Accept"],
        "supports_credentials": True
    },
    r"/admin/*": {
        "origins": ["*"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Accept"],
        "supports_credentials": True
    }
})

jwt = JWTManager(app)
ma = Marshmallow(app)

# Enable session support for admin
app.secret_key = os.getenv('SECRET_KEY')

# Configure logging
if not app.debug:
    handler = RotatingFileHandler('z10_group.log', maxBytes=10000, backupCount=3)
    handler.setLevel(logging.INFO)
    app.logger.addHandler(handler)

# Initialize Limiter
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

# Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, index=True, nullable=False)
    location = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), unique=True, index=True, nullable=False)
    username = db.Column(db.String(50), unique=True, index=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)
    profile_photo = db.Column(db.String(255), nullable=True)
    is_verified = db.Column(db.Boolean, default=False)
    verification_token = db.Column(db.String(100), unique=True, nullable=True)
    verification_sent_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    portfolio = db.relationship('Portfolio', backref='user', uselist=False, lazy=True)
    projects = db.relationship('Project', backref='user', lazy=True)
    loans = db.relationship('Loan', backref='user', lazy=True)
    transactions = db.relationship('Transaction', backref='user', lazy=True)
    mpesa_transactions = db.relationship('MpesaTransaction', backref='user', lazy=True)

class Portfolio(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    balance = db.Column(db.Float, default=0.0)
    loan_amount = db.Column(db.Float, default=0.0)
    accessible_loans = db.Column(db.Float, default=0.0)

class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    location = db.Column(db.String(100), nullable=False)
    business_category = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    budget_amount = db.Column(db.Float, nullable=False)
    my_allocation = db.Column(db.Float, nullable=False)
    bid_amount = db.Column(db.Float, default=0.0)
    collected_amount = db.Column(db.Float, default=0.0)
    percentage = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Loan(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    amount_taken = db.Column(db.Float, nullable=False)
    date_taken = db.Column(db.DateTime, default=datetime.utcnow)
    amount_due = db.Column(db.Float, nullable=False)
    due_date = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20), default='active')

class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    type = db.Column(db.String(20), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    phone_number = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(20), default='completed')
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    mpesa_receipt = db.Column(db.String(50), nullable=True)

class MpesaTransaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    checkout_request_id = db.Column(db.String(100), unique=True, nullable=False)
    merchant_request_id = db.Column(db.String(100), nullable=False)
    phone_number = db.Column(db.String(20), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    mpesa_receipt = db.Column(db.String(50), nullable=True)
    transaction_date = db.Column(db.String(50), nullable=True)
    result_code = db.Column(db.Integer, nullable=True)
    result_desc = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.utcnow)

class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True) # If NULL, it's a broadcast to all users
    type = db.Column(db.String(50), nullable=False) # 'system', 'deposit', 'loan', 'investment', 'admin'
    title = db.Column(db.String(100), nullable=False)
    message = db.Column(db.Text, nullable=False)
    read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Marshmallow Schemas
class UserSchema(Schema):
    full_name = fields.Str(required=True, validate=validate.Length(min=2, max=100))
    email = fields.Email(required=True)
    location = fields.Str(required=True)
    phone = fields.Str(required=True, validate=validate.Length(min=10, max=20))
    username = fields.Str(required=True, validate=validate.Length(min=3, max=50))
    password = fields.Str(required=True, validate=validate.Length(min=8))

class ProjectSchema(Schema):
    title = fields.Str(required=True, validate=validate.Length(min=2, max=200))
    location = fields.Str(required=True)
    business_category = fields.Str(required=True)
    description = fields.Str(required=True)
    budget_amount = fields.Float(required=True, validate=validate.Range(min=0))
    my_allocation = fields.Float(required=True, validate=validate.Range(min=0))

class ProjectUpdateSchema(Schema):
    title = fields.Str(validate=validate.Length(min=2, max=200))
    location = fields.Str()
    business_category = fields.Str()
    description = fields.Str()
    budget_amount = fields.Float(validate=validate.Range(min=0))

class TransactionSchema(Schema):
    type = fields.Str(required=True, validate=validate.OneOf(['deposit', 'withdrawal']))
    amount = fields.Float(required=True, validate=validate.Range(min=0))
    phone_number = fields.Str(required=True, validate=validate.Length(min=10, max=20))

class MpesaDepositSchema(Schema):
    phone_number = fields.Str(required=True, validate=validate.Length(min=10, max=20))
    amount = fields.Float(required=True, validate=validate.Range(min=1, max=150000))

class UserProfileUpdateSchema(Schema):
    full_name = fields.Str(validate=validate.Length(min=2, max=100))
    location = fields.Str()
    phone = fields.Str(validate=validate.Length(min=10, max=20))
    profile_photo = fields.Str() # Base64 or URL

# Email Service Class
class EmailService:
    def __init__(self):
        self.smtp_server = app.config['SMTP_SERVER']
        self.smtp_port = app.config['SMTP_PORT']
        self.smtp_username = app.config['SMTP_USERNAME']
        self.smtp_password = app.config['SMTP_PASSWORD']
        self.app_name = app.config['APP_NAME']
        # SSL is typically port 465, TLS is 587
        self.use_ssl = self.smtp_port == 465
        
        app.logger.info(f"EmailService initialized: {self.smtp_server}:{self.smtp_port} (SSL: {self.use_ssl})")
        
    def send_verification_email(self, email, token, username):
        """Send verification email to user"""
        try:
            verification_url = f"{app.config['VERIFICATION_BASE_URL']}/api/verify-email/{token}"
            
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f"Verify Your {self.app_name} Account"
            msg['From'] = self.smtp_username
            msg['To'] = email
            
            html = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <div style="background-color: #1a1a1a; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
                        <h1 style="color: #FFD700; margin: 0; font-size: 28px;">Z10 GROUP</h1>
                    </div>
                    <div style="padding: 30px;">
                        <h2 style="color: #1a1a1a;">Welcome to {self.app_name}, {username}!</h2>
                        <p>Thank you for registering with Z10 GROUP. Please verify your email address to activate your account.</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{verification_url}" style="background-color: #1a1a1a; color: #FFD700; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; border: 2px solid #FFD700;">
                                Verify Email Address
                            </a>
                        </div>
                        
                        <p>Or copy and paste this link in your browser:</p>
                        <p style="background-color: #f5f5f5; padding: 10px; border-radius: 5px; word-break: break-all;">
                            {verification_url}
                        </p>
                        
                        <p>If you didn't create an account with Z10 GROUP, please ignore this email.</p>
                    </div>
                    <div style="background-color: #f5f5f5; padding: 15px; text-align: center; border-radius: 0 0 10px 10px;">
                        <p style="margin: 0; color: #666; font-size: 12px;">
                            © 2025 Z10 GROUP. All rights reserved.
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            text = f"""
            Welcome to {self.app_name}, {username}!
            
            Please verify your email address by clicking the link below:
            {verification_url}
            
            If you didn't create an account with Z10 GROUP, please ignore this email.
            
            This link will expire in 24 hours.
            """
            
            part1 = MIMEText(text, 'plain')
            part2 = MIMEText(html, 'html')
            
            msg.attach(part1)
            msg.attach(part2)
            
            try:
                if self.use_ssl:
                    with smtplib.SMTP_SSL(self.smtp_server, self.smtp_port, timeout=15) as server:
                        server.login(self.smtp_username, self.smtp_password)
                        server.send_message(msg)
                else:
                    with smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=15) as server:
                        server.starttls()
                        server.login(self.smtp_username, self.smtp_password)
                        server.send_message(msg)
                
                app.logger.info(f"Verification email sent to {email}")
                return True
            except smtplib.SMTPException as se:
                app.logger.error(f"SMTP error sending verification email: {str(se)}")
                return False
            except Exception as e:
                app.logger.error(f"Network error sending verification email: {str(e)}")
                return False
            
        except Exception as e:
            app.logger.error(f"Failed to send verification email: {str(e)}")
            return False

    def send_welcome_email(self, email, username):
        """Send welcome email after verification"""
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = f"Welcome to {self.app_name}!"
            msg['From'] = self.smtp_username
            msg['To'] = email
            
            html = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <div style="background-color: #1a1a1a; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
                        <h1 style="color: #FFD700; margin: 0; font-size: 28px;">Z10 GROUP</h1>
                    </div>
                    <div style="padding: 30px;">
                        <h2 style="color: #1a1a1a;">Welcome to {self.app_name}!</h2>
                        <p>Hi {username},</p>
                        <p>Your account has been successfully verified and is now active!</p>
                        
                        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #FFD700;">
                            <h3 style="color: #1a1a1a; margin-top: 0;">Get Started</h3>
                            <ul style="padding-left: 20px;">
                                <li>Complete your profile</li>
                                <li>Explore investment projects</li>
                                <li>Make your first deposit</li>
                                <li>Start growing your finances</li>
                            </ul>
                        </div>
                        
                        <p>We're excited to have you on board!</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            part = MIMEText(html, 'html')
            msg.attach(part)
            
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            
            app.logger.info(f"Welcome email sent to {email}")
            return True
            
        except Exception as e:
            app.logger.error(f"Failed to send welcome email: {str(e)}")
            return False

# M-Pesa Service Class
class MpesaService:
    def __init__(self, environment='sandbox'):
        self.environment = environment
        if environment == 'sandbox':
            self.base_url = "https://sandbox.safaricom.co.ke"
        else:
            self.base_url = "https://api.safaricom.co.ke"
        
        self.consumer_key = app.config['MPESA_CONSUMER_KEY']
        self.consumer_secret = app.config['MPESA_CONSUMER_SECRET']
        self.business_shortcode = app.config['MPESA_BUSINESS_SHORTCODE']
        self.passkey = app.config['MPESA_PASSKEY']
        self.callback_url = app.config['MPESA_CALLBACK_URL']
        
    def get_access_token(self):
        """Get M-Pesa OAuth access token"""
        try:
            auth_string = f"{self.consumer_key}:{self.consumer_secret}"
            encoded_auth = base64.b64encode(auth_string.encode()).decode()
            
            headers = {
                'Authorization': f'Basic {encoded_auth}'
            }
            
            response = requests.get(
                f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials",
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                return response.json()['access_token']
            else:
                app.logger.error(f"M-Pesa token error: {response.text}")
                raise Exception(f"Failed to get access token: {response.status_code}")
                
        except Exception as e:
            app.logger.error(f"M-Pesa token exception: {str(e)}")
            raise
    
    def stk_push(self, phone_number, amount, account_reference, transaction_desc):
        """Initiate STK Push payment"""
        try:
            access_token = self.get_access_token()
            
            # Format phone number
            if phone_number.startswith('+254'):
                phone_number = '254' + phone_number[4:]
            elif phone_number.startswith('0'):
                phone_number = '254' + phone_number[1:]
            
            # Generate timestamp and password
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
            password = base64.b64encode(
                f"{self.business_shortcode}{self.passkey}{timestamp}".encode()
            ).decode()
            
            payload = {
                "BusinessShortCode": self.business_shortcode,
                "Password": password,
                "Timestamp": timestamp,
                "TransactionType": "CustomerPayBillOnline",
                "Amount": amount,
                "PartyA": phone_number,
                "PartyB": self.business_shortcode,
                "PhoneNumber": phone_number,
                "CallBackURL": self.callback_url,
                "AccountReference": account_reference,
                "TransactionDesc": transaction_desc
            }
            
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.post(
                f"{self.base_url}/mpesa/stkpush/v1/processrequest",
                json=payload,
                headers=headers,
                timeout=30
            )
            
            result = response.json()
            app.logger.info(f"M-Pesa STK Push response: {result}")
            
            return {
                'success': 'CheckoutRequestID' in result,
                'data': result,
                'message': result.get('ResponseDescription', 'STK Push initiated')
            }
            
        except Exception as e:
            app.logger.error(f"M-Pesa STK Push error: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'message': 'Failed to initiate payment'
            }

# Initialize services
email_service = EmailService()
mpesa_service = MpesaService(environment=app.config['MPESA_ENVIRONMENT'])

# Utility Functions
def validate_password_complexity(password):
    """Check password meets complexity requirements"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number"
    return True, "Password is valid"

# Initialize database
def init_db():
    with app.app_context():
        db.create_all()
        
        if User.query.first() is None:
            app.logger.info("Creating sample data...")
            
            # Create verified sample user for testing
            hashed_password = bcrypt.generate_password_hash('password123').decode('utf-8')
            sample_user = User(
                full_name='John Doe',
                email='test@example.com',
                location='Nairobi, Kenya',
                phone='+254712345678',
                username='johndoe',
                password=hashed_password,
                is_verified=True
            )
            db.session.add(sample_user)
            db.session.commit()
            
            # Create portfolio for sample user
            portfolio = Portfolio(user_id=sample_user.id, balance=75000, loan_amount=10000, accessible_loans=50000)
            db.session.add(portfolio)
            
            db.session.commit()
            app.logger.info("Sample data created successfully!")

# Error Handlers
@app.errorhandler(404)
def not_found_error(error):
    return jsonify({'error': 'Resource not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    app.logger.error(f'Internal server error: {str(error)}')
    return jsonify({'error': 'Internal server error'}), 500

# JWT Error Handlers
@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({'error': 'Token has expired'}), 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    return jsonify({'error': 'Invalid token'}), 401

@jwt.unauthorized_loader
def missing_token_callback(error):
    return jsonify({'error': 'Authorization token is missing'}), 401

# Import and register admin routes (after all models are defined)
try:
    from admin_app import register_admin_routes
    register_admin_routes(app, db, User, Portfolio, Project, Loan, Transaction, Notification, bcrypt)
    print("[OK] Admin endpoints loaded")
except Exception as e:
    print(f"Admin module error: {e}")

# ===== AUTHENTICATION ROUTES =====

@app.route('/api/test', methods=['GET'])
def test_connection():
    return jsonify({
        'message': 'Z10 GROUP Backend is running', 
        'status': 'success',
        'app_name': app.config['APP_NAME'],
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/api/register', methods=['POST'])
@limiter.limit("5 per minute")
def register():
    """Register a new user with email verification"""
    try:
        data = request.get_json()
        
        schema = UserSchema()
        errors = schema.validate(data)
        if errors:
            return jsonify({'error': errors}), 400
        
        if User.query.filter(db.func.lower(User.email) == db.func.lower(data['email'])).first():
            return jsonify({'error': 'Email already exists'}), 400
        
        if User.query.filter(db.func.lower(User.username) == db.func.lower(data['username'])).first():
            return jsonify({'error': 'Username already exists'}), 400
        
        if User.query.filter_by(phone=data['phone']).first():
            return jsonify({'error': 'Phone number already exists'}), 400
        
        is_valid, message = validate_password_complexity(data['password'])
        if not is_valid:
            return jsonify({'error': message}), 400
        
        hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
        verification_token = secrets.token_urlsafe(32)
        
        user = User(
            full_name=data['full_name'],
            email=data['email'],
            location=data['location'],
            phone=data['phone'],
            username=data['username'],
            password=hashed_password,
            is_verified=False,
            verification_token=verification_token,
            verification_sent_at=datetime.utcnow()
        )
        
        db.session.add(user)
        db.session.commit()
        
        portfolio = Portfolio(user_id=user.id)
        db.session.add(portfolio)
        db.session.commit()
        
        email_sent = email_service.send_verification_email(
            email=user.email,
            token=verification_token,
            username=user.username
        )
        
        if not email_sent:
            app.logger.warning(f"Failed to send verification email to {user.email}")
        
        app.logger.info(f'New user registered: {user.email}')
        
        return jsonify({
            'message': f'Registration successful! Please check your email to verify your {app.config["APP_NAME"]} account.',
            'user_id': user.id,
            'email': user.email,
            'verification_sent': email_sent
        }), 201
        
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        app.logger.error(f'Registration failed: {str(e)}')
        return jsonify({'error': 'Registration failed'}), 500

@app.route('/api/verify-email/<token>', methods=['GET'])
def verify_email(token):
    """Verify user's email address"""
    try:
        user = User.query.filter_by(verification_token=token).first()
        
        if not user:
            return jsonify({'error': 'Invalid or expired verification token'}), 400
        
        if user.verification_sent_at:
            time_diff = datetime.utcnow() - user.verification_sent_at
            if time_diff.total_seconds() > 24 * 60 * 60:
                new_token = secrets.token_urlsafe(32)
                user.verification_token = new_token
                user.verification_sent_at = datetime.utcnow()
                db.session.commit()
                
                email_service.send_verification_email(
                    email=user.email,
                    token=new_token,
                    username=user.username
                )
                
                return jsonify({
                    'error': 'Verification link expired. A new verification email has been sent.'
                }), 400
        
        user.is_verified = True
        user.verification_token = None
        user.verification_sent_at = None
        db.session.commit()
        
        email_service.send_welcome_email(
            email=user.email,
            username=user.username
        )
        
        app.logger.info(f'User email verified: {user.email}')
        
        success_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Email Verified - {app.config['APP_NAME']}</title>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    background-color: #f5f5f5;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                }}
                .container {{
                    background-color: white;
                    padding: 40px;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    text-align: center;
                    max-width: 500px;
                }}
                .logo {{
                    background-color: #1a1a1a;
                    color: #FFD700;
                    padding: 20px;
                    border-radius: 10px 10px 0 0;
                    font-size: 28px;
                    font-weight: bold;
                    margin-bottom: 20px;
                }}
                .success-icon {{
                    color: #4CAF50;
                    font-size: 60px;
                    margin-bottom: 20px;
                }}
                h1 {{
                    color: #1a1a1a;
                    margin-bottom: 20px;
                }}
                p {{
                    color: #666;
                    line-height: 1.6;
                    margin-bottom: 30px;
                }}
                .mobile-instruction {{
                    background-color: #f9f9f9;
                    padding: 20px;
                    border-radius: 5px;
                    margin: 20px 0;
                    text-align: left;
                    border-left: 4px solid #FFD700;
                }}
                .step {{
                    margin-bottom: 10px;
                    display: flex;
                    align-items: center;
                }}
                .step-number {{
                    background-color: #1a1a1a;
                    color: #FFD700;
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 10px;
                    font-weight: bold;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="logo">Z10 GROUP</div>
                <div class="success-icon">✓</div>
                <h1>Email Verified Successfully!</h1>
                <p>Your email address has been verified. Your account is now active.</p>
                
                <div class="mobile-instruction">
                    <h3 style="color: #1a1a1a; margin-top: 0;">Next Steps:</h3>
                    <div class="step">
                        <div class="step-number">1</div>
                        <span>Return to the Z10 GROUP mobile app</span>
                    </div>
                    <div class="step">
                        <div class="step-number">2</div>
                        <span>Login with your credentials</span>
                    </div>
                    <div class="step">
                        <div class="step-number">3</div>
                        <span>Start using your account!</span>
                    </div>
                </div>
                
                <p>You can now login to the mobile app with your credentials.</p>
            </div>
        </body>
        </html>
        """
        
        return success_html, 200
        
    except Exception as e:
        app.logger.error(f'Email verification failed: {str(e)}')
        return jsonify({'error': 'Verification failed'}), 500

@app.route('/api/resend-verification', methods=['POST'])
def resend_verification():
    """Resend verification email"""
    try:
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        user = User.query.filter_by(email=email).first()
        
        if not user:
            return jsonify({'error': 'Email not found'}), 404
        
        if user.is_verified:
            return jsonify({'error': 'Account is already verified'}), 400
        
        new_token = secrets.token_urlsafe(32)
        user.verification_token = new_token
        user.verification_sent_at = datetime.utcnow()
        db.session.commit()
        
        email_sent = email_service.send_verification_email(
            email=user.email,
            token=new_token,
            username=user.username
        )
        
        if not email_sent:
            return jsonify({'error': 'Failed to send verification email'}), 500
        
        return jsonify({
            'message': 'Verification email sent successfully',
            'email_sent': True
        }), 200
        
    except Exception as e:
        app.logger.error(f'Resend verification failed: {str(e)}')
        return jsonify({'error': 'Failed to resend verification'}), 500

@app.route('/api/login', methods=['POST'])
@limiter.limit("10 per minute")
def login():
    """User login with verification check"""
    try:
        data = request.get_json()
        
        if not data or 'email' not in data or 'password' not in data:
            return jsonify({'error': 'Email and password are required'}), 400
        
        user = User.query.filter_by(email=data['email']).first()
        
        if user and bcrypt.check_password_hash(user.password, data['password']):
            if not user.is_verified:
                return jsonify({
                    'error': 'Account not verified',
                    'message': f'Please verify your email address before logging in to {app.config["APP_NAME"]}.',
                    'needs_verification': True,
                    'email': user.email
                }), 403
            
            access_token = create_access_token(identity=str(user.id))
            portfolio = Portfolio.query.filter_by(user_id=user.id).first()
            
            app.logger.info(f'User logged in: {user.email}')
            
            return jsonify({
                'message': f'Welcome to {app.config["APP_NAME"]}, {user.username}!',
                'access_token': access_token,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'full_name': user.full_name,
                    'email': user.email,
                    'location': user.location,
                    'phone': user.phone,
                    'is_verified': user.is_verified
                },
                'portfolio': {
                    'balance': portfolio.balance if portfolio else 0,
                    'loan_amount': portfolio.loan_amount if portfolio else 0,
                    'accessible_loans': portfolio.accessible_loans if portfolio else 0
                }
            }), 200
        
        app.logger.warning(f'Failed login attempt for email: {data.get("email")}')
        return jsonify({'error': 'Invalid email or password'}), 401
        
    except Exception as e:
        app.logger.error(f'Login error: {str(e)}')
        return jsonify({'error': 'Login failed'}), 500

# ===== MPESA ROUTES =====

@app.route('/api/mpesa/initiate-deposit', methods=['POST'])
@jwt_required()
@limiter.limit("3 per minute")
def initiate_mpesa_deposit():
    """Initiate M-Pesa STK Push for deposit"""
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()
        
        schema = MpesaDepositSchema()
        errors = schema.validate(data)
        if errors:
            return jsonify({'error': errors}), 400
        
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        amount = float(data['amount'])
        phone_number = data['phone_number']
        
        if amount < 1 or amount > 150000:
            return jsonify({'error': 'Amount must be between 1 and 150,000 KES'}), 400
        
        result = mpesa_service.stk_push(
            phone_number=phone_number,
            amount=amount,
            account_reference=f"Z10_{user.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            transaction_desc=f"{app.config['APP_NAME']} Deposit"
        )
        
        if not result['success']:
            return jsonify({
                'error': result.get('error', 'Payment initiation failed'),
                'message': result['message']
            }), 400
        
        mpesa_transaction = MpesaTransaction(
            user_id=current_user_id,
            checkout_request_id=result['data'].get('CheckoutRequestID', ''),
            merchant_request_id=result['data'].get('MerchantRequestID', ''),
            phone_number=phone_number,
            amount=amount,
            status='pending'
        )
        db.session.add(mpesa_transaction)
        db.session.commit()
        
        app.logger.info(f"M-Pesa deposit initiated for user {current_user_id}: {amount} KES")
        
        return jsonify({
            'message': 'Payment initiated successfully. Please check your phone to complete the transaction.',
            'checkout_request_id': result['data'].get('CheckoutRequestID'),
            'merchant_request_id': result['data'].get('MerchantRequestID'),
            'transaction_id': mpesa_transaction.id
        }), 200
        
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        app.logger.error(f'M-Pesa deposit initiation error: {str(e)}')
        return jsonify({'error': 'Failed to initiate payment'}), 500

@app.route('/api/mpesa/callback', methods=['POST'])
def mpesa_callback():
    """Handle M-Pesa payment callback"""
    try:
        data = request.get_json()
        app.logger.info(f"M-Pesa callback received: {data}")
        
        if 'Body' not in data or 'stkCallback' not in data['Body']:
            return jsonify({'ResultCode': 1, 'ResultDesc': 'Invalid callback format'}), 400
        
        callback_data = data['Body']['stkCallback']
        checkout_request_id = callback_data.get('CheckoutRequestID')
        result_code = callback_data.get('ResultCode')
        result_desc = callback_data.get('ResultDesc')
        
        mpesa_transaction = MpesaTransaction.query.filter_by(
            checkout_request_id=checkout_request_id
        ).first()
        
        if not mpesa_transaction:
            app.logger.error(f"Transaction not found for checkout ID: {checkout_request_id}")
            return jsonify({'ResultCode': 1, 'ResultDesc': 'Transaction not found'}), 404
        
        mpesa_transaction.result_code = result_code
        mpesa_transaction.result_desc = result_desc
        
        if result_code == 0:
            mpesa_transaction.status = 'completed'
            
            callback_metadata = callback_data.get('CallbackMetadata', {})
            if 'Item' in callback_metadata:
                for item in callback_metadata['Item']:
                    if item.get('Name') == 'MpesaReceiptNumber':
                        mpesa_transaction.mpesa_receipt = item.get('Value')
                    elif item.get('Name') == 'TransactionDate':
                        mpesa_transaction.transaction_date = item.get('Value')
                    elif item.get('Name') == 'PhoneNumber':
                        mpesa_transaction.phone_number = str(item.get('Value'))
            
            portfolio = Portfolio.query.filter_by(user_id=mpesa_transaction.user_id).first()
            if portfolio:
                portfolio.balance += mpesa_transaction.amount
                
                transaction = Transaction(
                    user_id=mpesa_transaction.user_id,
                    type='deposit',
                    amount=mpesa_transaction.amount,
                    phone_number=mpesa_transaction.phone_number,
                    status='completed',
                    mpesa_receipt=mpesa_transaction.mpesa_receipt
                )
                db.session.add(transaction)
            
            app.logger.info(f"M-Pesa payment completed for transaction {checkout_request_id}")
            
        else:
            mpesa_transaction.status = 'failed'
            app.logger.warning(f"M-Pesa payment failed for transaction {checkout_request_id}: {result_desc}")
        
        mpesa_transaction.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({'ResultCode': 0, 'ResultDesc': 'Callback processed successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f'M-Pesa callback error: {str(e)}')
        return jsonify({'ResultCode': 1, 'ResultDesc': 'Callback processing failed'}), 500

@app.route('/api/mpesa/transaction-status/<string:checkout_request_id>', methods=['GET'])
@jwt_required()
def get_mpesa_transaction_status(checkout_request_id):
    """Check status of M-Pesa transaction"""
    try:
        current_user_id = int(get_jwt_identity())
        
        transaction = MpesaTransaction.query.filter_by(
            checkout_request_id=checkout_request_id,
            user_id=current_user_id
        ).first()
        
        if not transaction:
            return jsonify({'error': 'Transaction not found'}), 404
        
        return jsonify({
            'status': transaction.status,
            'amount': transaction.amount,
            'phone_number': transaction.phone_number,
            'mpesa_receipt': transaction.mpesa_receipt,
            'result_code': transaction.result_code,
            'result_desc': transaction.result_desc,
            'created_at': transaction.created_at.isoformat(),
            'updated_at': transaction.updated_at.isoformat() if transaction.updated_at else None
        }), 200
        
    except Exception as e:
        app.logger.error(f'Get transaction status error: {str(e)}')
        return jsonify({'error': 'Failed to get transaction status'}), 500

@app.route('/api/mpesa/transactions/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user_mpesa_transactions(user_id):
    """Get all M-Pesa transactions for a user"""
    try:
        current_user_id = int(get_jwt_identity())
        if current_user_id != user_id:
            return jsonify({'error': 'Unauthorized access'}), 403
        
        transactions = MpesaTransaction.query.filter_by(
            user_id=user_id
        ).order_by(MpesaTransaction.created_at.desc()).all()
        
        return jsonify({
            'transactions': [{
                'id': t.id,
                'checkout_request_id': t.checkout_request_id,
                'amount': t.amount,
                'phone_number': t.phone_number,
                'status': t.status,
                'mpesa_receipt': t.mpesa_receipt,
                'result_code': t.result_code,
                'result_desc': t.result_desc,
                'created_at': t.created_at.isoformat()
            } for t in transactions]
        }), 200
        
    except Exception as e:
        app.logger.error(f'Get M-Pesa transactions error: {str(e)}')
        return jsonify({'error': 'Failed to retrieve transactions'}), 500

@app.route('/api/mpesa/test-auth', methods=['GET'])
def test_mpesa_auth():
    """Test M-Pesa authentication"""
    try:
        token = mpesa_service.get_access_token()
        return jsonify({
            'success': True,
            'message': 'M-Pesa authentication successful',
            'token_available': bool(token)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'M-Pesa authentication failed'
        }), 500

# EXISTING ROUTES

@app.route('/api/dashboard/<int:user_id>', methods=['GET'])
@jwt_required()
def get_dashboard(user_id):
    """Get user dashboard data"""
    try:
        current_user_id = int(get_jwt_identity())
        if current_user_id != user_id:
            app.logger.warning(f'Unauthorized dashboard access attempt: {current_user_id} tried to access {user_id}')
            return jsonify({'error': 'Unauthorized access'}), 403
        
        user = User.query.options(
            db.joinedload(User.portfolio),
            db.joinedload(User.projects),
            db.joinedload(User.loans)
        ).get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        app.logger.info(f'Dashboard accessed by user: {user.email}')
        
        return jsonify({
            'user': {
                'name': user.full_name,
                'username': user.username,
                'email': user.email,
                'location': user.location,
                'phone': user.phone
            },
            'portfolio': {
                'balance': user.portfolio.balance if user.portfolio else 0,
                'loan_amount': user.portfolio.loan_amount if user.portfolio else 0,
                'accessible_loans': user.portfolio.accessible_loans if user.portfolio else 0
            },
            'projects': [{
                'id': p.id,
                'title': p.title,
                'location': p.location,
                'business_category': p.business_category,
                'description': p.description,
                'budget_amount': p.budget_amount,
                'my_allocation': p.my_allocation,
                'bid_amount': p.bid_amount,
                'collected_amount': p.collected_amount,
                'percentage': p.percentage,
                'created_at': p.created_at.isoformat()
            } for p in user.projects],
            'loans': [{
                'id': l.id,
                'amount_taken': l.amount_taken,
                'date_taken': l.date_taken.strftime('%Y-%m-%d'),
                'amount_due': l.amount_due,
                'due_date': l.due_date.strftime('%Y-%m-%d'),
                'status': l.status
            } for l in user.loans]
        }), 200
        
    except Exception as e:
        app.logger.error(f'Dashboard error: {str(e)}')
        return jsonify({'error': 'Failed to load dashboard'}), 500



# ===== PROJECTS ROUTES =====

@app.route('/api/projects', methods=['POST'])
@jwt_required()
def create_project():
    """Create a new project"""
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()
        
        schema = ProjectSchema()
        errors = schema.validate(data)
        if errors:
            return jsonify({'error': errors}), 400
        
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        portfolio = Portfolio.query.filter_by(user_id=current_user_id).first()
        if portfolio and data['my_allocation'] > portfolio.balance:
            return jsonify({'error': 'Insufficient balance for project allocation'}), 400
        
        project = Project(
            user_id=current_user_id,
            title=data['title'],
            location=data['location'],
            business_category=data['business_category'],
            description=data['description'],
            budget_amount=data['budget_amount'],
            my_allocation=data['my_allocation'],
            percentage=0.0,
            collected_amount=0.0
        )
        
        db.session.add(project)
        
        if portfolio:
            portfolio.balance -= data['my_allocation']
        
        db.session.commit()
        
        app.logger.info(f'Project created by user {current_user_id}: {data["title"]}')
        
        return jsonify({
            'message': 'Project created successfully',
            'project_id': project.id,
            'project': {
                'id': project.id,
                'title': project.title,
                'location': project.location,
                'business_category': project.business_category,
                'description': project.description,
                'budget_amount': project.budget_amount,
                'my_allocation': project.my_allocation,
                'percentage': project.percentage,
                'collected_amount': project.collected_amount,
                'created_at': project.created_at.isoformat()
            }
        }), 201
        
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        app.logger.error(f'Project creation error: {str(e)}')
        return jsonify({'error': 'Failed to create project'}), 500

@app.route('/api/projects/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user_projects(user_id):
    """Get all projects for a user"""
    try:
        current_user_id = int(get_jwt_identity())
        if current_user_id != user_id:
            return jsonify({'error': 'Unauthorized access'}), 403
        
        projects = Project.query.filter_by(user_id=user_id).order_by(Project.created_at.desc()).all()
        
        return jsonify({
            'projects': [{
                'id': p.id,
                'title': p.title,
                'location': p.location,
                'business_category': p.business_category,
                'description': p.description,
                'budget_amount': p.budget_amount,
                'my_allocation': p.my_allocation,
                'bid_amount': p.bid_amount,
                'collected_amount': p.collected_amount,
                'percentage': p.percentage,
                'created_at': p.created_at.isoformat()
            } for p in projects]
        }), 200
        
    except Exception as e:
        app.logger.error(f'Get projects error: {str(e)}')
        return jsonify({'error': 'Failed to retrieve projects'}), 500

@app.route('/api/projects/<int:project_id>', methods=['PUT'])
@jwt_required()
def update_project(project_id):
    """Update an existing project"""
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()
        
        project = Project.query.get(project_id)
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        if project.user_id != current_user_id:
            return jsonify({'error': 'Unauthorized to edit this project'}), 403
        
        schema = ProjectUpdateSchema()
        errors = schema.validate(data)
        if errors:
            return jsonify({'error': errors}), 400
        
        # Update fields
        if 'title' in data: project.title = data['title']
        if 'location' in data: project.location = data['location']
        if 'business_category' in data: project.business_category = data['business_category']
        if 'description' in data: project.description = data['description']
        if 'budget_amount' in data:
            project.budget_amount = data['budget_amount']
            # Recalculate percentage if budget changes
            if project.budget_amount > 0:
                project.percentage = (project.collected_amount / project.budget_amount) * 100
        
        db.session.commit()
        app.logger.info(f'Project {project_id} updated by user {current_user_id}')
        
        return jsonify({
            'message': 'Project updated successfully',
            'project': {
                'id': project.id,
                'title': project.title,
                'budget_amount': project.budget_amount,
                'percentage': project.percentage
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f'Project update error: {str(e)}')
        return jsonify({'error': 'Failed to update project'}), 500

@app.route('/api/projects/available', methods=['GET'])
def get_available_projects():
    """Get available projects for investment"""
    try:
        # Get projects that are not 100% funded
        projects = Project.query.filter(Project.percentage < 100).order_by(Project.created_at.desc()).limit(20).all()
        
        # Add investor count (simulated for now)
        projects_data = []
        for p in projects:
            projects_data.append({
                'id': p.id,
                'title': p.title,
                'location': p.location,
                'business_category': p.business_category,
                'description': p.description,
                'budget_amount': p.budget_amount,
                'required_amount': p.budget_amount - p.collected_amount,
                'collected_amount': p.collected_amount,
                'percentage': p.percentage,
                'created_at': p.created_at.isoformat(),
                'min_investment': 10000,  # Minimum investment amount
                'investors': random.randint(10, 100),  # Simulated
                'roi': f"{random.randint(15, 35)}%",  # Simulated ROI
                'duration': f"{random.randint(12, 36)} months"  # Simulated duration
            })
        
        return jsonify({
            'projects': projects_data,
            'count': len(projects_data)
        }), 200
        
    except Exception as e:
        app.logger.error(f'Get available projects error: {str(e)}')
        return jsonify({'error': 'Failed to retrieve available projects'}), 500

@app.route('/api/projects/invest', methods=['POST'])
@jwt_required()
def invest_in_project():
    """Invest in a project"""
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()
        
        project_id = data.get('project_id')
        amount = data.get('amount')
        
        if not project_id or not amount:
            return jsonify({'error': 'Project ID and amount are required'}), 400
        
        amount = float(amount)
        if amount < 10000:
            return jsonify({'error': 'Minimum investment is KES 10,000'}), 400
        
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        portfolio = Portfolio.query.filter_by(user_id=current_user_id).first()
        if not portfolio or amount > portfolio.balance:
            return jsonify({'error': 'Insufficient balance'}), 400
        
        project = Project.query.get(project_id)
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        if project.percentage >= 100:
            return jsonify({'error': 'Project is already fully funded'}), 400
        
        # Update project funding
        project.collected_amount += amount
        project.percentage = (project.collected_amount / project.budget_amount) * 100
        
        # Add bid amount for the user
        project.bid_amount += amount
        
        # Update user balance
        portfolio.balance -= amount
        
        # Create transaction record
        transaction = Transaction(
            user_id=current_user_id,
            type='investment',
            amount=amount,
            phone_number=user.phone,
            status='completed'
        )
        db.session.add(transaction)
        
        db.session.commit()
        
        app.logger.info(f'User {current_user_id} invested {amount} in project {project_id}')
        
        return jsonify({
            'message': 'Investment successful',
            'new_balance': portfolio.balance,
            'project': {
                'collected_amount': project.collected_amount,
                'percentage': project.percentage
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f'Investment error: {str(e)}')
        return jsonify({'error': 'Investment failed'}), 500

@app.route('/api/transactions', methods=['POST'])
@jwt_required()
def create_transaction():
    """Create a new transaction (deposit/withdrawal)"""
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()
        
        schema = TransactionSchema()
        errors = schema.validate(data)
        if errors:
            return jsonify({'error': errors}), 400
        
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        portfolio = Portfolio.query.filter_by(user_id=current_user_id).first()
        if not portfolio:
            portfolio = Portfolio(user_id=current_user_id)
            db.session.add(portfolio)
        
        if data['type'] == 'withdrawal' and data['amount'] > portfolio.balance:
            return jsonify({'error': 'Insufficient balance for withdrawal'}), 400
        
        transaction = Transaction(
            user_id=current_user_id,
            type=data['type'],
            amount=data['amount'],
            phone_number=data['phone_number']
        )
        db.session.add(transaction)
        
        if data['type'] == 'deposit':
            portfolio.balance += data['amount']
        elif data['type'] == 'withdrawal':
            portfolio.balance -= data['amount']
        
        db.session.commit()
        
        app.logger.info(f'Transaction created by user {current_user_id}: {data["type"]} of {data["amount"]}')
        
        return jsonify({
            'message': 'Transaction completed successfully',
            'transaction_id': transaction.id,
            'new_balance': portfolio.balance
        }), 201
        
    except ValidationError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        app.logger.error(f'Transaction error: {str(e)}')
        return jsonify({'error': 'Transaction failed'}), 500

@app.route('/api/transactions/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user_transactions(user_id):
    """Get all transactions for a user"""
    try:
        current_user_id = int(get_jwt_identity())
        if current_user_id != user_id:
            return jsonify({'error': 'Unauthorized access'}), 403
        
        transactions = Transaction.query.filter_by(user_id=user_id).order_by(Transaction.timestamp.desc()).all()
        
        return jsonify({
            'transactions': [{
                'id': t.id,
                'type': t.type,
                'amount': t.amount,
                'phone_number': t.phone_number,
                'status': t.status,
                'timestamp': t.timestamp.isoformat()
            } for t in transactions]
        }), 200
        
    except Exception as e:
        app.logger.error(f'Get transactions error: {str(e)}')
        return jsonify({'error': 'Failed to retrieve transactions'}), 500

@app.route('/api/profile/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user_profile(user_id):
    """Get user profile"""
    try:
        current_user_id = int(get_jwt_identity())
        if current_user_id != user_id:
            return jsonify({'error': 'Unauthorized access'}), 403
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'user': {
                'id': user.id,
                'full_name': user.full_name,
                'email': user.email,
                'username': user.username,
                'location': user.location,
                'phone': user.phone,
                'is_verified': user.is_verified,
                'created_at': user.created_at.isoformat()
            }
        }), 200
        
    except Exception as e:
        app.logger.error(f'Get profile error: {str(e)}')
        return jsonify({'error': 'Failed to retrieve profile'}), 500

@app.route('/api/profile/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_user_profile(user_id):
    """Update user profile info and photo"""
    try:
        current_user_id = int(get_jwt_identity())
        if current_user_id != user_id:
            return jsonify({'error': 'Unauthorized access'}), 403
        
        data = request.get_json()
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        schema = UserProfileUpdateSchema()
        errors = schema.validate(data)
        if errors:
            return jsonify({'error': errors}), 400
        
        if 'full_name' in data: user.full_name = data['full_name']
        if 'location' in data: user.location = data['location']
        if 'phone' in data: user.phone = data['phone']
        # Note: profile_photo handling would involve saving to disk/S3 in production
        # For now we'll just acknowledge it or store the string if small
        
        db.session.commit()
        app.logger.info(f'Profile updated for user {user_id}')
        
        return jsonify({'message': 'Profile updated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        app.logger.error(f'Profile update error: {str(e)}')
        return jsonify({'error': 'Failed to update profile'}), 500

# ===== NOTIFICATION ROUTES =====

@app.route('/api/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    """Get notifications for the current user"""
    try:
        current_user_id = int(get_jwt_identity())
        
        # Get notifications for this user OR broadcast (user_id is NULL)
        notifications = Notification.query.filter(
            (Notification.user_id == current_user_id) | (Notification.user_id == None)
        ).order_by(Notification.created_at.desc()).limit(50).all()
        
        return jsonify({
            'notifications': [{
                'id': n.id,
                'type': n.type,
                'title': n.title,
                'message': n.message,
                'read': n.read,
                'time': n.created_at.isoformat()
            } for n in notifications]
        }), 200
    except Exception as e:
        app.logger.error(f'Get notifications error: {str(e)}')
        return jsonify({'error': 'Failed to load notifications'}), 500

@app.route('/api/notifications/read', methods=['POST'])
@jwt_required()
def mark_notifications_read():
    """Mark all current notifications as read"""
    try:
        current_user_id = int(get_jwt_identity())
        Notification.query.filter_by(user_id=current_user_id, read=False).update({'read': True})
        db.session.commit()
        return jsonify({'message': 'Notifications marked as read'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update notifications'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'app_name': app.config['APP_NAME'],
        'timestamp': datetime.utcnow().isoformat(),
        'database': 'connected' if db.session.bind else 'disconnected',
        'server_ip': '172.16.75.42',
        'port': 5000
    }), 200


@app.route('/api/upload', methods=['POST'])
@jwt_required()
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file:
        from werkzeug.utils import secure_filename
        filename = secure_filename(f"{secrets.token_hex(8)}_{file.filename}")
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        file_url = f"{request.host_url.rstrip('/')}/uploads/{filename}"
        return jsonify({
            'message': 'File uploaded successfully',
            'file_url': file_url,
            'filename': filename
        }), 201

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    from flask import send_from_directory
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

if __name__ == '__main__':
    init_db()
    print("=" * 60)
    print("Z10 GROUP Backend Started!")
    print(f"Application: {app.config['APP_NAME']}")
    print(f"Local URL: http://localhost:5000")
    print(f"Network URL: http://172.16.75.42:5000")
    print(f"M-Pesa Environment: {app.config['MPESA_ENVIRONMENT']}")
    print("=" * 60)
    print("Key Endpoints:")
    print("  POST http://172.16.75.42:5000/api/register")
    print("  POST http://172.16.75.42:5000/api/login")
    print("  POST http://172.16.75.42:5000/api/mpesa/initiate-deposit")
    print("  GET  http://172.16.75.42:5000/api/mpesa/test-auth")
    print("=" * 60)
    print("Sample user: test@example.com / password123")
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=5000, debug=True)
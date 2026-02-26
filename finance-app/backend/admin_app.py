"""
Z10 GROUP Admin Dashboard Routes
Manage users, verify accounts, and control platform
"""
from flask import request, jsonify, session, redirect, url_for
from datetime import datetime

def register_admin_routes(app, db, User, Portfolio, Project, Loan, Transaction, Notification, bcrypt):
    """Register admin routes on the Flask app"""
    
    @app.route('/admin', methods=['GET'])
    def admin_dashboard():
        """Admin API - get statistics"""
        if 'admin_logged_in' not in session:
            app.logger.warning(f"Unauthorized access attempt to /admin. Session contents: {list(session.keys())}")
            return jsonify({'error': 'Unauthorized'}), 401
        
        try:
            total_users = User.query.count()
            verified_users = User.query.filter_by(is_verified=True).count()
            unverified_users = User.query.filter_by(is_verified=False).count()
            total_projects = Project.query.count()
            total_loans = Loan.query.count()
            all_users = User.query.order_by(User.created_at.desc()).all()
            
            stats = {
                'total_users': total_users,
                'verified_users': verified_users,
                'unverified_users': unverified_users,
                'total_projects': total_projects,
                'total_loans': total_loans,
                'recent_users': [{
                    'id': u.id,
                    'full_name': u.full_name,
                    'email': u.email,
                    'phone': u.phone,
                    'is_verified': u.is_verified,
                    'created_at': u.created_at.isoformat(),
                    'total_debt': sum(l.amount_due for l in u.loans if l.status != 'paid'),
                    'projects': ", ".join([p.title for p in u.projects]) if u.projects else "None"
                } for u in all_users]
            }
            
            return jsonify(stats), 200
        except Exception as e:
            app.logger.error(f'Dashboard error: {str(e)}')
            return jsonify({'error': 'Failed to load dashboard'}), 500

    @app.route('/admin/login', methods=['GET', 'POST'])
    def admin_login():
        """Admin login"""
        if request.method == 'POST':
            data = request.get_json()
            username = data.get('username')
            password = data.get('password')
            
            if username == 'admin' and password == 'Z10Admin@2026':
                session['admin_logged_in'] = True
                session['admin_user'] = username
                app.logger.info(f"Admin login success: {username}")
                return jsonify({'message': 'Login successful'}), 200
            else:
                return jsonify({'error': 'Invalid credentials'}), 401
        
        # Return login page HTML
        return '''<!DOCTYPE html>
<html><head><title>Z10 GROUP Admin - Login</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;background:linear-gradient(135deg,#1a1a1a 0%,#2a2a2a 100%);min-height:100vh;display:flex;align-items:center;justify-content:center}.login-container{background:white;padding:40px;border-radius:10px;box-shadow:0 10px 40px rgba(0,0,0,0.3);width:100%;max-width:400px}.logo{text-align:center;margin-bottom:30px;font-size:28px;font-weight:bold;color:#1a1a1a}.logo span{color:#FFD700}h1{text-align:center;font-size:24px;color:#1a1a1a;margin-bottom:10px}.subtitle{text-align:center;color:#666;margin-bottom:30px;font-size:14px}.form-group{margin-bottom:20px}label{display:block;margin-bottom:8px;color:#333;font-weight:500}input{width:100%;padding:12px;border:1px solid #E0E0E0;border-radius:5px;font-size:14px;transition:border-color 0.3s}input:focus{outline:none;border-color:#FFD700}.login-btn{width:100%;padding:12px;background:#1a1a1a;color:white;border:none;border-radius:5px;font-size:16px;font-weight:600;cursor:pointer;margin-top:20px;transition:background 0.3s}.login-btn:hover{background:#0a0a0a}.error{color:#d32f2f;margin-top:10px;text-align:center;font-size:14px}.info{background:#f5f5f5;padding:15px;border-radius:5px;margin-top:20px;font-size:12px;color:#666;border-left:4px solid #FFD700}</style></head><body><div class="login-container"><div class="logo">Z10 <span>GROUP</span></div><h1>Admin Portal</h1><p class="subtitle">Platform Management Dashboard</p><form id="loginForm"><div class="form-group"><label for="username">Username</label><input type="text" id="username" name="username" placeholder="Enter username" required></div><div class="form-group"><label for="password">Password</label><input type="password" id="password" name="password" placeholder="Enter password" required></div><button type="submit" class="login-btn">Login</button><div id="error" class="error"></div></form><div class="info"><strong>Demo Credentials:</strong><br>Username: <code>admin</code><br>Password: <code>Z10Admin@2026</code></div></div><script>document.getElementById('loginForm').addEventListener('submit',async(e)=>{e.preventDefault();const username=document.getElementById('username').value;const password=document.getElementById('password').value;const errorDiv=document.getElementById('error');try{const response=await fetch('/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});const data=await response.json();if(response.ok){window.location.href='/admin/dashboard'}else{errorDiv.textContent=data.error}}catch(error){errorDiv.textContent='Login failed. Please try again.'}});</script></body></html>'''

    @app.route('/admin/logout', methods=['POST'])
    def admin_logout():
        """Logout"""
        session.clear()
        return jsonify({'message': 'Logged out'}), 200

    @app.route('/admin/dashboard', methods=['GET'])
    def admin_dashboard_page():
        """Admin dashboard page"""
        if 'admin_logged_in' not in session:
            return redirect(url_for('admin_login'))
        
        return '''<!DOCTYPE html>
<html><head><title>Z10 GROUP Admin - Dashboard</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;background:#f5f5f5;color:#333}.navbar{background:#1a1a1a;color:white;padding:20px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 2px 10px rgba(0,0,0,0.1)}.logo{font-size:20px;font-weight:bold}.logo span{color:#FFD700}.nav-buttons button{background:#FFD700;color:#1a1a1a;border:none;padding:8px 16px;border-radius:5px;cursor:pointer;font-weight:600;margin-left:10px}.container{max-width:1400px;margin:0 auto;padding:20px}.header{margin-bottom:30px}.header h1{font-size:32px;margin-bottom:5px}.tabs{display:flex;gap:10px;margin-bottom:20px;border-bottom:2px solid #E0E0E0}.tab-btn{padding:12px 20px;background:0;border:0;border-bottom:3px solid transparent;cursor:pointer;font-size:14px;font-weight:600;color:#666;transition:all 0.3s}.tab-btn.active{border-bottom-color:#FFD700;color:#1a1a1a}.content{background:white;padding:20px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.05)}.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;margin-bottom:30px}.stat-card{background:linear-gradient(135deg,#1a1a1a 0%,#2a2a2a 100%);color:white;padding:20px;border-radius:10px;text-align:center}.stat-value{font-size:32px;font-weight:bold;color:#FFD700;margin:10px 0}.stat-label{font-size:12px;opacity:0.8}.users-table{width:100%;border-collapse:collapse;margin-top:20px}.users-table th{background:#f5f5f5;padding:15px;text-align:left;font-weight:600;border-bottom:2px solid #E0E0E0}.users-table td{padding:15px;border-bottom:1px solid #E0E0E0}.users-table tr:hover{background:#fafafa}.badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600}.badge-verified{background:#c8e6c9;color:#2e7d32}.badge-unverified{background:#ffccbc;color:#d84315}.action-buttons{display:flex;gap:5px;flex-wrap:wrap}.btn{padding:6px 12px;border:0;border-radius:5px;cursor:pointer;font-size:12px;font-weight:600;transition:all 0.3s}.btn-verify{background:#4CAF50;color:white}.btn-verify:hover{background:#388E3C}.btn-delete{background:#f44336;color:white}.btn-delete:hover{background:#d32f2f}.btn-reset{background:#2196F3;color:white}.btn-reset:hover{background:#1976D2}.btn-notify{background:#FF9800;color:white}.btn-notify:hover{background:#F57C00}.search-box{margin-bottom:20px;display:flex;gap:10px}.search-box input{width:100%;max-width:400px;padding:10px 15px;border:1px solid #E0E0E0;border-radius:5px;font-size:14px}.tab-content{display:none}.tab-content.active{display:block}.modal{display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:1000;align-items:center;justify-content:center}.modal.active{display:flex}.modal-content{background:white;padding:30px;border-radius:10px;max-width:500px;width:90%;box-shadow:0 5px 20px rgba(0,0,0,0.3)}.modal-content h2{margin-bottom:20px;color:#1a1a1a}.modal-content p{margin-bottom:15px;color:#666}.modal-buttons{display:flex;gap:10px;justify-content:flex-end;margin-top:20px}.modal-buttons button{padding:10px 20px;border:0;border-radius:5px;cursor:pointer;font-weight:600}.modal-confirm{background:#4CAF50;color:white}.modal-cancel{background:#E0E0E0;color:#333}input,textarea,select{width:100%;padding:10px;margin-bottom:15px;border:1px solid #ddd;border-radius:5px}</style></head><body><div class="navbar"><div class="logo">Z10 <span>GROUP</span> Admin</div><div class="nav-buttons"><button onclick="logout()">Logout</button></div></div><div class="container"><div class="header"><h1>Admin Dashboard</h1><p style="color:#666">Manage users, verify accounts, and control platform</p></div><div class="tabs"><button class="tab-btn active" onclick="switchTab(\'overview\', this)">Overview</button><button class="tab-btn" onclick="switchTab(\'users\', this)">Users</button><button class="tab-btn" onclick="switchTab(\'broadcast\', this)">Broadcast</button></div><div class="content"><div id="overview" class="tab-content active"><div class="stats-grid"><div class="stat-card"><div class="stat-label">Total Users</div><div class="stat-value" id="totalUsers">0</div></div><div class="stat-card"><div class="stat-label">Verified Users</div><div class="stat-value" id="verifiedUsers">0</div></div><div class="stat-card"><div class="stat-label">Unverified Users</div><div class="stat-value" id="unverifiedUsers">0</div></div><div class="stat-card"><div class="stat-label">Active Projects</div><div class="stat-value" id="totalProjects">0</div></div><div class="stat-card"><div class="stat-label">Active Loans</div><div class="stat-value" id="totalLoans">0</div></div></div><h3 style="margin-top:30px;margin-bottom:15px">Recent Users</h3><div id="recentUsers"></div></div><div id="users" class="tab-content"><div class="search-box"><input type="text" id="userSearch" placeholder="Search users by name, email, or phone..."><button class="btn btn-notify" onclick="openBroadcastModal()">Broadcast Message</button></div><table class="users-table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Joined</th><th>Debts</th><th>Projects</th><th>Actions</th></tr></thead><tbody id="usersTableBody"></tbody></table></div><div id="broadcast" class="tab-content"><h3>System Broadcast</h3><p>Send a message to all users on the platform.</p><div style="max-width:600px;margin-top:20px"><label>Title</label><input type="text" id="bTitle" placeholder="Notification Title"><label>Message</label><textarea id="bMessage" rows="4" placeholder="Enter your message..."></textarea><button class="btn btn-notify" style="width:100%;padding:15px" onclick="sendBroadcast()">Send Broadcast to All Users</button></div></div></div></div><div id="verifyModal" class="modal"><div class="modal-content"><h2>Verify User</h2><p>Are you sure you want to verify this user account?</p><p id="verifyUserInfo" style="font-weight:600"></p><div class="modal-buttons"><button class="modal-cancel" onclick="closeVerifyModal()">Cancel</button><button class="modal-confirm" onclick="confirmVerify()">Verify</button></div></div></div><div id="notifyModal" class="modal"><div class="modal-content"><h2>Send Notification</h2><p id="notifyUserInfo"></p><input type="text" id="nTitle" placeholder="Title"><textarea id="nMessage" rows="4" placeholder="Message"></textarea><select id="nType"><option value="admin">Admin Message</option><option value="security">Security Alert</option><option value="system">System Update</option></select><div class="modal-buttons"><button class="modal-cancel" onclick="closeNotifyModal()">Cancel</button><button class="modal-confirm" onclick="confirmNotify()">Send Notification</button></div></div></div><script>let allUsers=[];let selectedUserId=null;async function loadDashboard(){try{const response=await fetch(\'/admin\');const data=await response.json();document.getElementById(\'totalUsers\').textContent=data.total_users;document.getElementById(\'verifiedUsers\').textContent=data.verified_users;document.getElementById(\'unverifiedUsers\').textContent=data.unverified_users;document.getElementById(\'totalProjects\').textContent=data.total_projects;document.getElementById(\'totalLoans\').textContent=data.total_loans;allUsers=data.recent_users;loadUsersTable(allUsers);const recentHtml=allUsers.slice(0,5).map(u=>`<div style="padding:10px 0;border-bottom:1px solid #E0E0E0"><div style="display:flex;justify-content:space-between"><div><strong>${u.full_name}</strong><br><small style="color:#666">${u.email}</small></div><span class="badge ${u.is_verified?\'badge-verified\':\'badge-unverified\'}">${u.is_verified?\'Verified\':\'Pending\'}</span></div></div>`).join(\'\');document.getElementById(\'recentUsers\').innerHTML=recentHtml}catch(error){console.error(\'Error loading dashboard:\',error);alert(\'Failed to load dashboard\')}}function loadUsersTable(users){const tbody=document.getElementById(\'usersTableBody\');tbody.innerHTML=users.map(u=>`<tr><td>${u.full_name}</td><td>${u.email}</td><td>${u.phone}</td><td><span class="badge ${u.is_verified?\'badge-verified\':\'badge-unverified\'}">${u.is_verified?\'Verified\':\'Pending\'}</span></td><td>${new Date(u.created_at).toLocaleDateString()}</td><td>KES ${u.total_debt.toLocaleString()}</td><td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${u.projects}">${u.projects}</td><td><div class="action-buttons">${!u.is_verified?`<button class="btn btn-verify" onclick="openVerifyModal(${u.id},\'${u.full_name}\')">Verify</button>`:\'\'}<button class="btn btn-reset" onclick="resetPassword(${u.id},\'${u.full_name}\')">Reset PW</button><button class="btn btn-notify" onclick="openNotifyModal(${u.id},\'${u.full_name}\')">Notify</button><button class="btn btn-delete" onclick="deleteUser(${u.id})">Delete</button></div></td></tr>`).join(\'\')}function switchTab(tab, btn){document.querySelectorAll(\'.tab-content\').forEach(el=>el.classList.remove(\'active\'));document.querySelectorAll(\'.tab-btn\').forEach(el=>el.classList.remove(\'active\'));document.getElementById(tab).classList.add(\'active\');btn.classList.add(\'active\')}function openVerifyModal(userId,userName){selectedUserId=userId;document.getElementById(\'verifyUserInfo\').textContent=`Verify account for: ${userName}`;document.getElementById(\'verifyModal\').classList.add(\'active\')}function closeVerifyModal(){document.getElementById(\'verifyModal\').classList.remove(\'active\');selectedUserId=null}async function confirmVerify(){try{const response=await fetch(\'/admin/verify-user/\' + selectedUserId,{method:\'POST\',headers:{\'Content-Type\':\'application/json\'}});if(response.ok){alert(\'User verified successfully!\');closeVerifyModal();loadDashboard()}else{alert(\'Failed to verify user\')}}catch(error){alert(\'Error: \'+error.message)}}function openNotifyModal(userId,userName){selectedUserId=userId;document.getElementById(\'notifyUserInfo\').textContent=`Send notification to: ${userName}`;document.getElementById(\'notifyModal\').classList.add(\'active\')}function closeNotifyModal(){document.getElementById(\'notifyModal\').classList.remove(\'active\')}async function confirmNotify(){const title=document.getElementById(\'nTitle\').value;const message=document.getElementById(\'nMessage\').value;const type=document.getElementById(\'nType\').value;try{const response=await fetch(\'/admin/send-notification\',{method:\'POST\',headers:{\'Content-Type\':\'application/json\'},body:JSON.stringify({user_id:selectedUserId,title,message,type})});if(response.ok){alert(\'Notification sent!\');closeNotifyModal()}else{alert(\'Failed to send\')}}catch(e){alert(e.message)}}async function sendBroadcast(){const title=document.getElementById(\'bTitle\').value;const message=document.getElementById(\'bMessage\').value;try{const response=await fetch(\'/admin/send-notification\',{method:\'POST\',headers:{\'Content-Type\':\'application/json\'},body:JSON.stringify({user_id:null,title,message,type:\'system\'})});if(response.ok){alert(\'Broadcast sent to all users!\');document.getElementById(\'bTitle\').value=\'\';document.getElementById(\'bMessage\').value=\'\'}else{alert(\'Failed to send broadcast\')}}catch(e){alert(e.message)}}function resetPassword(userId,name){if(confirm(`Are you sure you want to reset password for ${name}?`)){fetch(\'/admin/reset-password/\' + userId,{method:\'POST\'}).then(res=>res.json()).then(data=>{alert(data.message||data.error)})}}function deleteUser(userId){if(confirm(\'Are you sure you want to delete this user? This action cannot be undone.\')){fetch(\'/admin/delete-user/\' + userId,{method:\'DELETE\'}).then(res=>res.json()).then(()=>{alert(\'User deleted\');loadDashboard()})}}function logout(){fetch(\'/admin/logout\',{method:\'POST\'}).then(()=>window.location.href=\'/admin/login\')}document.getElementById(\'userSearch\').addEventListener(\'input\',e=>{const search=e.target.value.toLowerCase();const filtered=allUsers.filter(u=>u.full_name.toLowerCase().includes(search)||u.email.toLowerCase().includes(search)||u.phone.includes(search));loadUsersTable(filtered)});loadDashboard();</script></body></html>'''

    @app.route('/admin/verify-user/<int:user_id>', methods=['POST'])
    def verify_user(user_id):
        """Verify user"""
        if 'admin_logged_in' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        
        try:
            user = User.query.get(user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            user.is_verified = True
            db.session.commit()
            app.logger.info(f'Admin verified user: {user.email}')
            return jsonify({'message': f'User {user.email} verified'}), 200
        except Exception as e:
            db.session.rollback()
            app.logger.error(f'Error verifying user: {str(e)}')
            return jsonify({'error': 'Failed to verify user'}), 500

    @app.route('/admin/delete-user/<int:user_id>', methods=['DELETE'])
    def delete_user(user_id):
        """Delete user"""
        if 'admin_logged_in' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        
        try:
            user = User.query.get(user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            Portfolio.query.filter_by(user_id=user_id).delete()
            Project.query.filter_by(user_id=user_id).delete()
            Loan.query.filter_by(user_id=user_id).delete()
            Transaction.query.filter_by(user_id=user_id).delete()
            Notification.query.filter_by(user_id=user_id).delete()
            
            db.session.delete(user)
            db.session.commit()
            app.logger.info(f'Admin deleted user: {user.email}')
            return jsonify({'message': f'User {user.email} deleted'}), 200
        except Exception as e:
            db.session.rollback()
            app.logger.error(f'Error deleting user: {str(e)}')
            return jsonify({'error': 'Failed to delete user'}), 500

    @app.route('/admin/reset-password/<int:user_id>', methods=['POST'])
    def reset_user_password(user_id):
        """Reset user password to default"""
        if 'admin_logged_in' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        
        try:
            user = User.query.get(user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            new_password = "Password@2026" # Default reset password
            user.password = bcrypt.generate_password_hash(new_password).decode('utf-8')
            db.session.commit()
            
            # Send notification to user
            notif = Notification(
                user_id=user.id,
                type='security',
                title='Password Reset',
                message='An administrator has reset your password. Please use the default password to login and change it immediately.'
            )
            db.session.add(notif)
            db.session.commit()
            
            app.logger.info(f'Admin reset password for user: {user.email}')
            return jsonify({'message': f'Password reset successfully for {user.full_name}'}), 200
        except Exception as e:
            db.session.rollback()
            app.logger.error(f'Error resetting password: {str(e)}')
            return jsonify({'error': 'Failed to reset password'}), 500

    @app.route('/admin/send-notification', methods=['POST'])
    def send_notification():
        """Send a notification to a specific user or broadcast"""
        if 'admin_logged_in' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        
        try:
            data = request.get_json()
            user_id = data.get('user_id') # Can be None for broadcast
            title = data.get('title')
            message = data.get('message')
            notif_type = data.get('type', 'admin')
            
            if not title or not message:
                return jsonify({'error': 'Title and message are required'}), 400
            
            notif = Notification(
                user_id=user_id,
                type=notif_type,
                title=title,
                message=message
            )
            db.session.add(notif)
            db.session.commit()
            
            return jsonify({'message': 'Notification sent successfully'}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': 'Failed to send notification'}), 500

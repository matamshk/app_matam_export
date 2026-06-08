import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:firebase_core/firebase_core.dart';
import 'services/firestore_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Try initializing Firebase
  bool isFirebaseInitialized = false;
  try {
    await Firebase.initializeApp();
    isFirebaseInitialized = true;
    print('Firebase initialized successfully!');
  } catch (e) {
    print('Firebase initialization failed: $e. You must add google-services.json inside android/app/ to connect.');
  }

  runApp(MatamApp(isFirebaseInitialized: isFirebaseInitialized));
}

class MatamApp extends StatelessWidget {
  final bool isFirebaseInitialized;
  
  const MatamApp({super.key, required this.isFirebaseInitialized});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'مأتم - نظام الإدارة والتحكم',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        primaryColor: const Color(0xFFD4AF37), // Premium Gold
        scaffoldBackgroundColor: const Color(0xFF0A0A0A), // Deep Charcoal
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFD4AF37),
          secondary: Color(0xFF8B0000), // Crimson Accent
          surface: Color(0xFF121212),
        ),
      ),
      home: ConnectionScreen(isFirebaseInitialized: isFirebaseInitialized),
    );
  }
}

class ConnectionScreen extends StatefulWidget {
  final bool isFirebaseInitialized;
  
  const ConnectionScreen({super.key, required this.isFirebaseInitialized});

  @override
  State<ConnectionScreen> createState() => _ConnectionScreenState();
}

class _ConnectionScreenState extends State<ConnectionScreen> {
  final TextEditingController _urlController = TextEditingController();
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadSavedUrl();
  }

  Future<void> _loadSavedUrl() async {
    final prefs = await SharedPreferences.getInstance();
    final savedUrl = prefs.getString('server_url') ?? 'http://10.0.2.2:8080';
    _urlController.text = savedUrl;
    setState(() {
      _isLoading = false;
    });
  }

  Future<void> _saveUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('server_url', url);
  }

  void _connect(BuildContext context, String mode) {
    String url = _urlController.text.trim();
    if (mode == 'server' && url.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('الرجاء إدخال رابط الخادم')),
      );
      return;
    }

    if (mode == 'server') {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'http://$url';
      }
      _saveUrl(url);
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => WebServerView(
          serverUrl: url,
          mode: mode,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(color: Color(0xFFD4AF37)),
        ),
      );
    }

    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 400),
            padding: const EdgeInsets.all(32.0),
            decoration: BoxDecoration(
              color: const Color(0xFF121212),
              borderRadius: BorderRadius.circular(8.0),
              border: Border.all(
                color: const Color(0xFFD4AF37).withOpacity(0.2),
                width: 1,
              ),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(
                  Icons.mosque_outlined,
                  size: 64,
                  color: Color(0xFFD4AF37),
                ),
                const SizedBox(height: 16),
                const Text(
                  'نظام إدارة المأتم',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    fontFamily: 'Libre Caslon Text',
                    color: Color(0xFFD4AF37),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  widget.isFirebaseInitialized
                      ? 'تم تهيئة قاعدة بيانات Firestore بنجاح!'
                      : 'قاعدة بيانات Firestore بحاجة إلى تهيئة (ملف google-services.json)',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13,
                    color: widget.isFirebaseInitialized ? Colors.green : Colors.orangeAccent,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 24),
                
                // Firestore Mode Button
                ElevatedButton(
                  onPressed: widget.isFirebaseInitialized 
                      ? () => _connect(context, 'firestore')
                      : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFD4AF37),
                    foregroundColor: const Color(0xFF0A0A0A),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    disabledBackgroundColor: Colors.grey.withOpacity(0.3),
                    textStyle: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  child: const Text('التشغيل السحابي (Firestore Mode)'),
                ),
                
                const SizedBox(height: 20),
                const Divider(color: Colors.grey),
                const SizedBox(height: 20),
                
                // URL input field for Server Mode
                TextField(
                  controller: _urlController,
                  decoration: const InputDecoration(
                    labelText: 'عنوان خادم بايثون المحلي (Server URL)',
                    labelStyle: TextStyle(color: Color(0xFFD4AF37)),
                    hintText: '192.168.1.100:8080',
                    border: OutlineInputBorder(),
                  ),
                  keyboardType: TextInputType.url,
                ),
                const SizedBox(height: 12),
                
                // Connect to local python server button
                OutlinedButton(
                  onPressed: () => _connect(context, 'server'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: BorderSide(color: Colors.white.withOpacity(0.5)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: const Text('الاتصال بخادم بايثون المحلي'),
                ),
                const SizedBox(height: 8),
                
                // Local static mode button
                OutlinedButton(
                  onPressed: () => _connect(context, 'offline'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.grey,
                    side: BorderSide(color: Colors.grey.withOpacity(0.5)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: const Text('التشغيل محلياً بدون خادم (Static Mode)'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class WebServerView extends StatefulWidget {
  final String serverUrl;
  final String mode; // 'firestore', 'server', 'offline'

  const WebServerView({
    super.key,
    required this.serverUrl,
    required this.mode,
  });

  @override
  State<WebServerView> createState() => _WebServerViewState();
}

class _WebServerViewState extends State<WebServerView> {
  late final WebViewController _controller;
  final FirestoreService _firestoreService = FirestoreService();
  bool _loading = true;
  double _progress = 0;

  // JS script to inject at page start.
  // Overrides the native `fetch` inside Javascript to redirect `/api/` calls to the FirebaseBridge channel
  final String _fetchOverrideScript = '''
    (function() {
      if (window.fetch_overridden) return;
      window.fetch_overridden = true;
      const originalFetch = window.fetch;
      window.fetch = function(input, init) {
        let url = typeof input === 'string' ? input : input.url;
        // Intercept relative API calls
        if (url.startsWith('/api/') || url.includes('/api/')) {
          // Normalize url to relative API path
          const apiPath = url.substring(url.indexOf('/api/'));
          const method = (init && init.method) || 'GET';
          const body = (init && init.body) ? JSON.parse(init.body) : null;
          
          return new Promise((resolve) => {
            const requestId = Math.random().toString(36).substring(2);
            window['api_response_' + requestId] = function(response) {
              delete window['api_response_' + requestId];
              if (response.error) {
                resolve(new Response(JSON.stringify({ error: response.error }), {
                  status: 500,
                  headers: { 'Content-Type': 'application/json' }
                }));
              } else {
                resolve(new Response(JSON.stringify(response.data), {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' }
                }));
              }
            };
            
            // Post message to Flutter
            window.FirebaseBridge.postMessage(JSON.stringify({
              requestId: requestId,
              path: apiPath,
              method: method,
              body: body
            }));
          });
        }
        return originalFetch.apply(this, arguments);
      };
    })();
  ''';

  @override
  void initState() {
    super.initState();

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF0A0A0A))
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (int progress) {
            setState(() {
              _progress = progress / 100.0;
            });
          },
          onPageStarted: (String url) async {
            setState(() {
              _loading = true;
            });
            // Inject fetch override script immediately on start
            if (widget.mode == 'firestore') {
              await _controller.runJavaScript(_fetchOverrideScript);
            }
          },
          onPageFinished: (String url) async {
            setState(() {
              _loading = false;
            });
            // Ensure injected script is applied on finished
            if (widget.mode == 'firestore') {
              await _controller.runJavaScript(_fetchOverrideScript);
            }
          },
          onWebResourceError: (WebResourceError error) {
            if (widget.mode == 'server' && 
               (error.errorType == WebResourceErrorType.hostLookup ||
                error.errorType == WebResourceErrorType.connect)) {
              _showErrorDialog(error.description);
            }
          },
        ),
      );

    // If Firestore mode is chosen, we add the FirebaseBridge JavaScript channel to bridge requests
    if (widget.mode == 'firestore') {
      _controller.addJavaScriptChannel(
        'FirebaseBridge',
        onMessageReceived: (JavaScriptMessage message) async {
          try {
            final Map<String, dynamic> msg = jsonDecode(message.message);
            final String requestId = msg['requestId'];
            final String path = msg['path'];
            final dynamic body = msg['body'];

            dynamic responseData;

            if (path.startsWith('/api/data')) {
              responseData = await _firestoreService.fetchFullDatabase();
            } else if (path == '/api/save_booking') {
              await _firestoreService.saveBooking(body);
              responseData = {"status": "success"};
            } else if (path == '/api/update_booking_status') {
              await _firestoreService.updateBookingStatus(body['id'], body['status']);
              responseData = {"status": "success"};
            } else if (path == '/api/delete_booking') {
              await _firestoreService.deleteBooking(body['id']);
              responseData = {"status": "success"};
            } else if (path == '/api/edit_booking') {
              await _firestoreService.editBooking(body['id'], body['name'], body['phone'], body['date']);
              responseData = {"status": "success"};
            } else if (path == '/api/save_custom_occasion') {
              await _firestoreService.saveCustomOccasion(body);
              responseData = {"status": "success"};
            } else if (path == '/api/save_contribution') {
              await _firestoreService.saveContribution(body);
              responseData = {"status": "success"};
            } else if (path == '/api/save_offset') {
              await _firestoreService.saveOffset(body['offset']);
              responseData = {"status": "success"};
            } else if (path == '/api/save_settings') {
              await _firestoreService.saveSettings(body['settings']);
              responseData = {"status": "success"};
            } else if (path == '/api/login') {
              final dbData = await _firestoreService.fetchFullDatabase();
              final List<dynamic> users = dbData['users'] ?? [];
              final user = users.firstWhere(
                (u) => u['username'] == body['username'] && u['password'] == body['password'],
                orElse: () => null,
              );
              
              if (user != null) {
                final String token = DateTime.now().millisecondsSinceEpoch.toString();
                final sessionData = {
                  "user_id": user['id'],
                  "role": user['role'],
                  "name": user['name']
                };
                await _firestoreService.saveSession(token, sessionData);
                responseData = {
                  "status": "success",
                  "token": token,
                  "role": user['role'],
                  "name": user['name']
                };
              } else {
                responseData = {"error": "Invalid password"};
              }
            } else if (path == '/api/verify') {
              final dbData = await _firestoreService.fetchFullDatabase();
              final Map<String, dynamic> sessions = Map<String, dynamic>.from(dbData['sessions'] ?? {});
              final token = body['token']?.toString();
              
              if (token != null && sessions.containsKey(token)) {
                final sessionInfo = sessions[token];
                final List<dynamic> users = dbData['users'] ?? [];
                final user = users.firstWhere(
                  (u) => u['id'] == sessionInfo['user_id'],
                  orElse: () => null,
                );
                final perms = user != null ? (user['permissions'] ?? {}) : {};
                responseData = {
                  "status": "success",
                  "role": sessionInfo['role'],
                  "name": sessionInfo['name'],
                  "permissions": perms
                };
              } else {
                responseData = {"error": "Session expired"};
              }
            } else if (path == '/api/get_users') {
              final dbData = await _firestoreService.fetchFullDatabase();
              final List<dynamic> users = dbData['users'] ?? [];
              final List<Map<String, dynamic>> safeUsers = users
                  .map<Map<String, dynamic>>((u) => {
                        "id": u['id'],
                        "username": u['username'],
                        "name": u['name'] ?? '',
                        "role": u['role'],
                        "permissions": u['permissions'] ?? {}
                      })
                  .toList();
              responseData = {
                "status": "success",
                "users": safeUsers
              };
            } else if (path == '/api/save_user') {
              await _firestoreService.saveUser(body['user']);
              responseData = {"status": "success"};
            } else if (path == '/api/delete_user') {
              await _firestoreService.deleteUser(body['id']);
              responseData = {"status": "success"};
            } else if (path == '/api/upload_prayer_reference') {
              await _firestoreService.savePrayerReference(
                body['file_data'] ?? '',
                body['filename'] ?? '',
                body['update_option'] ?? 'download_only',
              );
              responseData = {
                "status": "success",
                "file_url": body['file_data']
              };
            } else {
              responseData = {"status": "error", "message": "Unknown path"};
            }

            final String jsCallback = 'window.api_response_$requestId(${jsonEncode({"data": responseData})})';
            await _controller.runJavaScript(jsCallback);
          } catch (e) {
            print('Error in JavaScript bridge: $e');
            final Map<String, dynamic> msg = jsonDecode(message.message);
            final String requestId = msg['requestId'];
            final String jsCallback = 'window.api_response_$requestId(${jsonEncode({"error": e.toString()})})';
            await _controller.runJavaScript(jsCallback);
          }
        },
      );
    }

    // Load web content
    if (widget.mode == 'server') {
      _controller.loadRequest(Uri.parse(widget.serverUrl));
    } else {
      // Both Firestore Mode and Offline Mode load local index.html assets
      _controller.loadFlutterAsset('assets/www/index.html');
    }
  }

  void _showErrorDialog(String description) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('خطأ في الاتصال'),
          content: Text(
            'فشل الاتصال بالخادم في ${widget.serverUrl}.\n\nالرجاء التأكد من تشغيل خادم بايثون وتوصيل الهاتف بنفس الشبكة.\n\nالتفاصيل: $description',
            textAlign: TextAlign.right,
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                Navigator.pop(context);
              },
              child: const Text('تعديل الإعدادات'),
            ),
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                _controller.reload();
              },
              child: const Text('إعادة المحاولة'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return WillPopScope(
      onWillPop: () async {
        if (await _controller.canGoBack()) {
          await _controller.goBack();
          return false;
        }
        return true;
      },
      child: Scaffold(
        appBar: PreferredSize(
          preferredSize: const Size.fromHeight(0.0),
          child: AppBar(
            backgroundColor: const Color(0xFF0A0A0A),
            elevation: 0,
          ),
        ),
        body: SafeArea(
          child: Stack(
            children: [
              WebViewWidget(controller: _controller),
              if (_loading)
                Column(
                  children: [
                    LinearProgressIndicator(
                      value: _progress,
                      color: const Color(0xFFD4AF37),
                      backgroundColor: Colors.transparent,
                    ),
                    Expanded(
                      child: Container(
                        color: const Color(0xFF0A0A0A),
                        child: const Center(
                          child: CircularProgressIndicator(
                            color: Color(0xFFD4AF37),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }
}

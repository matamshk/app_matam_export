import 'package:cloud_firestore/cloud_firestore.dart';

class FirestoreService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  // Fetch full database in the structure expected by the webapp
  Future<Map<String, dynamic>> fetchFullDatabase() async {
    try {
      // 1. Fetch bookings
      final bookingsSnapshot = await _db
          .collection('bookings')
          .orderBy('date', descending: true)
          .get();
      final List<Map<String, dynamic>> bookings = bookingsSnapshot.docs
          .map((doc) => {...doc.data(), 'id': doc.id})
          .toList();

      // 2. Fetch occasions
      final occasionsSnapshot = await _db.collection('custom_occasions').get();
      final List<Map<String, dynamic>> occasions = occasionsSnapshot.docs
          .map((doc) => {...doc.data(), 'id': doc.id})
          .toList();

      // 3. Fetch contributions
      final contributionsSnapshot = await _db
          .collection('contributions')
          .orderBy('timestamp', descending: true)
          .get();
      final List<Map<String, dynamic>> contributions = contributionsSnapshot.docs
          .map((doc) => {...doc.data(), 'id': doc.id})
          .toList();

      // 4. Fetch metadata (settings and hijri offset)
      final settingsDoc = await _db.collection('metadata').doc('settings').get();
      final hijriDoc = await _db.collection('metadata').doc('hijri').get();

      final Map<String, dynamic> settings = settingsDoc.data() ?? {
        "whatsapp_phone": "97300000000"
      };
      final int hijriOffset = hijriDoc.data()?['offset'] ?? 0;

      // 5. Fetch users list
      final usersSnapshot = await _db.collection('users').get();
      final List<Map<String, dynamic>> users = usersSnapshot.docs
          .map((doc) => {...doc.data(), 'id': doc.id})
          .toList();
          
      // Seed default user if empty
      if (users.isEmpty) {
        final Map<String, dynamic> defaultUser = {
          "username": "admin",
          "password": "admin123",
          "role": "superadmin",
          "name": "المدير العام",
          "permissions": {}
        };
        await _db.collection('users').doc('superadmin1').set(defaultUser);
        users.add({...defaultUser, 'id': 'superadmin1'});
      }

      // 6. Fetch sessions
      final sessionsSnapshot = await _db.collection('sessions').get();
      final Map<String, dynamic> sessions = {};
      for (var doc in sessionsSnapshot.docs) {
        sessions[doc.id] = doc.data();
      }

      return {
        "bookings": bookings,
        "custom_occasions": occasions,
        "contributions": contributions,
        "hijri_offset": hijriOffset,
        "settings": settings,
        "users": users,
        "sessions": sessions
      };
    } catch (e) {
      print('Error fetching Firestore database: $e');
      rethrow;
    }
  }

  // Save a new booking
  Future<void> saveBooking(Map<String, dynamic> booking) async {
    final String id = booking['id']?.toString() ?? 
        DateTime.now().millisecondsSinceEpoch.toString();
    
    await _db.collection('bookings').doc(id).set({
      'name': booking['name'] ?? '',
      'phone': booking['phone'] ?? '',
      'date': booking['date'] ?? '',
      'occasion': booking['occasion'] ?? '',
      'notes': booking['notes'] ?? '',
      'status': booking['status'] ?? 'pending',
      'timestamp': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
  }

  // Update booking status
  Future<void> updateBookingStatus(String bookingId, String newStatus) async {
    await _db.collection('bookings').doc(bookingId).update({
      'status': newStatus,
    });
  }

  // Delete a booking
  Future<void> deleteBooking(String bookingId) async {
    await _db.collection('bookings').doc(bookingId).delete();
  }

  // Edit a booking
  Future<void> editBooking(String bookingId, String name, String phone, String date) async {
    await _db.collection('bookings').doc(bookingId).update({
      'name': name,
      'phone': phone,
      'date': date,
    });
  }

  // Save custom occasion
  Future<void> saveCustomOccasion(Map<String, dynamic> occasion) async {
    final String id = occasion['id']?.toString() ?? 
        DateTime.now().millisecondsSinceEpoch.toString();

    await _db.collection('custom_occasions').doc(id).set({
      'title': occasion['title'] ?? '',
      'hijri': occasion['hijri'] ?? {},
      'type': occasion['type'] ?? 'custom',
      'description': occasion['description'] ?? '',
      'isCustom': occasion['isCustom'] ?? true,
    });
  }

  // Save a contribution
  Future<void> saveContribution(Map<String, dynamic> contribution) async {
    final String id = contribution['id']?.toString() ?? 
        DateTime.now().millisecondsSinceEpoch.toString();

    await _db.collection('contributions').doc(id).set({
      'donor_name': contribution['donor_name'] ?? '',
      'amount': contribution['amount'] ?? 0.0,
      'type': contribution['type'] ?? '',
      'phone': contribution['phone'] ?? '',
      'receipt_image': contribution['receipt_image'], // Stores filepath/URL or base64
      'deceased_list': contribution['deceased_list'] ?? [],
      'status': contribution['status'] ?? 'pending',
      'timestamp': FieldValue.serverTimestamp(),
    });
  }

  // Save Hijri offset
  Future<void> saveOffset(int offset) async {
    await _db.collection('metadata').doc('hijri').set({
      'offset': offset,
    }, SetOptions(merge: true));
  }

  // Save application settings
  Future<void> saveSettings(Map<String, dynamic> settings) async {
    await _db.collection('metadata').doc('settings').set(
      settings,
      SetOptions(merge: true),
    );
  }

  // Save or edit a user
  Future<void> saveUser(Map<String, dynamic> user) async {
    final String id = user['id']?.toString() ?? 
        'user_${DateTime.now().millisecondsSinceEpoch}';
    
    await _db.collection('users').doc(id).set({
      'username': user['username'] ?? '',
      'password': user['password'] ?? '',
      'name': user['name'] ?? '',
      'role': user['role'] ?? 'user',
      'permissions': user['permissions'] ?? {},
    }, SetOptions(merge: true));
  }

  // Delete a user
  Future<void> deleteUser(String userId) async {
    await _db.collection('users').doc(userId).delete();
  }

  // Save session details
  Future<void> saveSession(String token, Map<String, dynamic> sessionData) async {
    await _db.collection('sessions').doc(token).set(
      sessionData,
      SetOptions(merge: true),
    );
  }

  // Save prayer reference file (base64)
  Future<void> savePrayerReference(String fileData, String filename, String updateOption) async {
    await _db.collection('metadata').doc('prayer_reference').set({
      'file_data': fileData,
      'filename': filename,
      'update_option': updateOption,
      'timestamp': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));

    await _db.collection('metadata').doc('settings').set({
      'prayer_reference_url': fileData,
      'prayer_reference_option': updateOption,
    }, SetOptions(merge: true));
  }
}


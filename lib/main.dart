import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_web_plugins/url_strategy.dart';

import 'core/router.dart';
import 'core/theme.dart';
import 'firebase_options.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  usePathUrlStrategy(); // Clean web URLs like /food/123 instead of /#/food/123.
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  // Riverpod retries failed providers by default. Turn that off: AI calls count
  // against a daily quota, and every error screen already has a retry button.
  runApp(ProviderScope(retry: (retryCount, error) => null, child: const ConsciousCartApp()));
}

class ConsciousCartApp extends ConsumerWidget {
  const ConsciousCartApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'Conscious Cart',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(Brightness.light),
      darkTheme: buildTheme(Brightness.dark),
      routerConfig: ref.watch(routerProvider),
    );
  }
}

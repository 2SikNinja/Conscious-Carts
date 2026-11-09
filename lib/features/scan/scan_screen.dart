import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../services/api_service.dart';
import '../../state/providers.dart';

enum _ScanStatus { scanning, looking, notFound, failed }

/// Scans UPC/EAN barcodes with the camera (phone or laptop) and opens the product.
/// Manual entry covers devices without a camera or blurry codes.
class ScanScreen extends ConsumerStatefulWidget {
  const ScanScreen({super.key});

  @override
  ConsumerState<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends ConsumerState<ScanScreen> {
  final scannerController = MobileScannerController(
    formats: const [BarcodeFormat.ean13, BarcodeFormat.ean8, BarcodeFormat.upcA, BarcodeFormat.upcE],
    detectionSpeed: DetectionSpeed.noDuplicates,
  );
  final manualController = TextEditingController();

  _ScanStatus status = _ScanStatus.scanning;
  String? lastCode;
  String? errorMessage;

  @override
  void dispose() {
    scannerController.dispose();
    manualController.dispose();
    super.dispose();
  }

  Future<void> onDetect(BarcodeCapture capture) async {
    if (status != _ScanStatus.scanning) return;
    final code = capture.barcodes
        .map((barcode) => barcode.rawValue)
        .whereType<String>()
        .firstWhere((value) => value.isNotEmpty, orElse: () => '');
    if (code.isEmpty) return;
    HapticFeedback.mediumImpact();
    await lookup(code);
  }

  Future<void> lookup(String rawCode) async {
    final code = rawCode.replaceAll(RegExp(r'\D'), '');
    if (code.length < 6) {
      setState(() {
        status = _ScanStatus.failed;
        errorMessage = 'Enter the full number under the barcode.';
      });
      return;
    }
    setState(() {
      status = _ScanStatus.looking;
      lastCode = code;
      errorMessage = null;
    });
    await scannerController.stop();
    try {
      final food = await ref.read(apiServiceProvider).lookupBarcode(code);
      if (!mounted) return;
      if (food == null) {
        setState(() => status = _ScanStatus.notFound);
        return;
      }
      context.pushReplacement('/food/${food.fdcId}');
    } catch (error) {
      if (!mounted) return;
      setState(() {
        status = _ScanStatus.failed;
        errorMessage = friendlyError(error);
      });
    }
  }

  Future<void> scanAgain() async {
    setState(() {
      status = _ScanStatus.scanning;
      errorMessage = null;
    });
    await scannerController.start();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: const Text('Scan a barcode', style: TextStyle(color: Colors.white)),
        leading: IconButton(
          tooltip: 'Close',
          icon: const Icon(Icons.close_rounded),
          onPressed: () => context.canPop() ? context.pop() : context.go('/search'),
        ),
        actions: [
          IconButton(
            tooltip: 'Flashlight',
            icon: const Icon(Icons.flashlight_on_rounded),
            onPressed: () => scannerController.toggleTorch(),
          ),
          IconButton(
            tooltip: 'Switch camera',
            icon: const Icon(Icons.cameraswitch_rounded),
            onPressed: () => scannerController.switchCamera(),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: Stack(
              fit: StackFit.expand,
              children: [
                MobileScanner(
                  controller: scannerController,
                  onDetect: onDetect,
                  errorBuilder: (context, error) => _CameraError(error: error),
                ),
                const IgnorePointer(child: _Viewfinder()),
                if (status == _ScanStatus.looking)
                  const ColoredBox(
                    color: Color(0x99000000),
                    child: Center(child: CircularProgressIndicator(color: Colors.white)),
                  ),
              ],
            ),
          ),
          Material(
            color: theme.colorScheme.surface,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
            child: SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 520),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _StatusMessage(status: status, code: lastCode, errorMessage: errorMessage),
                      if (status == _ScanStatus.notFound || status == _ScanStatus.failed) ...[
                        const SizedBox(height: 12),
                        FilledButton.tonalIcon(
                          onPressed: scanAgain,
                          icon: const Icon(Icons.qr_code_scanner_rounded),
                          label: const Text('Scan again'),
                        ),
                      ],
                      const SizedBox(height: 16),
                      TextField(
                        controller: manualController,
                        keyboardType: TextInputType.number,
                        inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(14)],
                        textInputAction: TextInputAction.search,
                        onSubmitted: lookup,
                        decoration: InputDecoration(
                          hintText: 'Or type the barcode number',
                          prefixIcon: const Icon(Icons.dialpad_rounded),
                          suffixIcon: IconButton(
                            tooltip: 'Look up',
                            icon: const Icon(Icons.arrow_forward_rounded),
                            onPressed: () => lookup(manualController.text),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusMessage extends StatelessWidget {
  const _StatusMessage({required this.status, required this.code, required this.errorMessage});

  final _ScanStatus status;
  final String? code;
  final String? errorMessage;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (icon, text) = switch (status) {
      _ScanStatus.scanning => (Icons.center_focus_strong_rounded, 'Point the camera at the barcode on the package.'),
      _ScanStatus.looking => (Icons.search_rounded, 'Looking up $code…'),
      _ScanStatus.notFound => (
          Icons.search_off_rounded,
          'No USDA product matches $code. Many store brands and new items are missing. Try searching by name.',
        ),
      _ScanStatus.failed => (Icons.error_outline_rounded, errorMessage ?? 'Something went wrong.'),
    };
    return Row(
      children: [
        Icon(icon, color: theme.colorScheme.primary),
        const SizedBox(width: 12),
        Expanded(child: Text(text, style: theme.textTheme.bodyMedium)),
      ],
    );
  }
}

class _Viewfinder extends StatelessWidget {
  const _Viewfinder();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: FractionallySizedBox(
        widthFactor: 0.78,
        child: AspectRatio(
          aspectRatio: 1.9,
          child: DecoratedBox(
            decoration: BoxDecoration(
              border: Border.all(color: Colors.white, width: 3),
              borderRadius: BorderRadius.circular(18),
            ),
          ),
        ),
      ),
    );
  }
}

class _CameraError extends StatelessWidget {
  const _CameraError({required this.error});

  final MobileScannerException error;

  @override
  Widget build(BuildContext context) {
    final message = switch (error.errorCode) {
      MobileScannerErrorCode.permissionDenied => 'Camera access is blocked. Allow it in your browser or device settings, or type the number below.',
      MobileScannerErrorCode.unsupported => 'This device or browser cannot scan barcodes. Type the number below instead.',
      _ => 'The camera could not start. Type the barcode number below instead.',
    };
    return ColoredBox(
      color: Colors.black,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.no_photography_outlined, color: Colors.white70, size: 48),
              const SizedBox(height: 16),
              Text(message, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white)),
            ],
          ),
        ),
      ),
    );
  }
}

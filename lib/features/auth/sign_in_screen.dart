import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../services/api_service.dart';
import '../../state/providers.dart';
import '../../widgets/states.dart';
import '../shell/app_shell.dart';

/// Sign in, create an account, or continue as a guest.
///
/// With [upgrade] set, a guest is turning their session into a real account,
/// so only the create-account form is shown.
class SignInScreen extends ConsumerStatefulWidget {
  const SignInScreen({super.key, this.upgrade = false});

  final bool upgrade;

  @override
  ConsumerState<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends ConsumerState<SignInScreen> {
  final formKey = GlobalKey<FormState>();
  final emailController = TextEditingController();
  final passwordController = TextEditingController();
  final confirmController = TextEditingController();

  late bool isCreating = widget.upgrade;
  bool isBusy = false;
  bool obscurePassword = true;
  String? errorMessage;

  @override
  void dispose() {
    emailController.dispose();
    passwordController.dispose();
    confirmController.dispose();
    super.dispose();
  }

  Future<void> run(Future<void> Function() action) async {
    setState(() {
      isBusy = true;
      errorMessage = null;
    });
    try {
      await action();
      if (mounted && widget.upgrade) {
        showMessage(context, 'Account created. Your favorites and profile are saved.');
        context.go('/profile');
      }
    } catch (error) {
      if (mounted) setState(() => errorMessage = friendlyError(error));
    } finally {
      if (mounted) setState(() => isBusy = false);
    }
  }

  Future<void> submit() async {
    if (!(formKey.currentState?.validate() ?? false)) return;
    final auth = ref.read(authServiceProvider);
    await run(() => isCreating
        ? auth.createAccount(emailController.text, passwordController.text)
        : auth.signIn(emailController.text, passwordController.text));
  }

  Future<void> resetPassword() async {
    final email = emailController.text.trim();
    if (!email.contains('@')) {
      setState(() => errorMessage = 'Enter your email above, then tap "Forgot password" again.');
      return;
    }
    await run(() async {
      await ref.read(authServiceProvider).sendPasswordReset(email);
      if (mounted) showMessage(context, 'If an account exists for $email, a reset link is on its way.');
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: widget.upgrade ? AppBar(title: const Text('Create your account')) : null,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: AutofillGroup(
                child: Form(
                  key: formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (!widget.upgrade) ...[
                        Center(
                          child: ClipOval(
                            child: Image.asset('assets/images/logo.png', width: 120, height: 120, semanticLabel: 'Conscious Cart logo'),
                          ),
                        ),
                        const SizedBox(height: 12),
                        const Center(child: Wordmark(fontSize: 34)),
                        const SizedBox(height: 6),
                        Text(
                          'Know what you eat before it hits your cart.',
                          textAlign: TextAlign.center,
                          style: theme.textTheme.bodyLarge?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                        ),
                        const SizedBox(height: 28),
                        SegmentedButton<bool>(
                          showSelectedIcon: false,
                          segments: const [
                            ButtonSegment(value: false, label: Text('Sign in')),
                            ButtonSegment(value: true, label: Text('Create account')),
                          ],
                          selected: {isCreating},
                          onSelectionChanged: (selection) => setState(() {
                            isCreating = selection.first;
                            errorMessage = null;
                          }),
                        ),
                        const SizedBox(height: 20),
                      ] else ...[
                        Text(
                          'Keep your favorites and dietary profile, and sign in from any device.',
                          style: theme.textTheme.bodyLarge,
                        ),
                        const SizedBox(height: 20),
                      ],
                      TextFormField(
                        controller: emailController,
                        keyboardType: TextInputType.emailAddress,
                        autofillHints: const [AutofillHints.email],
                        textInputAction: TextInputAction.next,
                        decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.mail_outline_rounded)),
                        validator: (value) {
                          final email = value?.trim() ?? '';
                          if (email.isEmpty) return 'Enter your email.';
                          if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email)) return 'That email looks invalid.';
                          return null;
                        },
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: passwordController,
                        obscureText: obscurePassword,
                        autofillHints: [isCreating ? AutofillHints.newPassword : AutofillHints.password],
                        textInputAction: isCreating ? TextInputAction.next : TextInputAction.done,
                        onFieldSubmitted: isCreating ? null : (_) => submit(),
                        decoration: InputDecoration(
                          labelText: 'Password',
                          prefixIcon: const Icon(Icons.lock_outline_rounded),
                          suffixIcon: IconButton(
                            tooltip: obscurePassword ? 'Show password' : 'Hide password',
                            icon: Icon(obscurePassword ? Icons.visibility_rounded : Icons.visibility_off_rounded),
                            onPressed: () => setState(() => obscurePassword = !obscurePassword),
                          ),
                        ),
                        validator: (value) {
                          final password = value ?? '';
                          if (password.isEmpty) return 'Enter your password.';
                          if (isCreating && password.length < 8) return 'Use at least 8 characters.';
                          return null;
                        },
                      ),
                      if (isCreating) ...[
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: confirmController,
                          obscureText: obscurePassword,
                          autofillHints: const [AutofillHints.newPassword],
                          textInputAction: TextInputAction.done,
                          onFieldSubmitted: (_) => submit(),
                          decoration: const InputDecoration(
                            labelText: 'Confirm password',
                            prefixIcon: Icon(Icons.lock_outline_rounded),
                          ),
                          validator: (value) => value == passwordController.text ? null : 'Passwords do not match.',
                        ),
                      ],
                      if (errorMessage != null) ...[
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: theme.colorScheme.errorContainer,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(errorMessage!, style: TextStyle(color: theme.colorScheme.onErrorContainer)),
                        ),
                      ],
                      const SizedBox(height: 20),
                      FilledButton(
                        onPressed: isBusy ? null : submit,
                        child: isBusy
                            ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2))
                            : Text(isCreating ? 'Create account' : 'Sign in'),
                      ),
                      if (!isCreating)
                        Align(
                          alignment: Alignment.centerRight,
                          child: TextButton(onPressed: isBusy ? null : resetPassword, child: const Text('Forgot password?')),
                        ),
                      if (!widget.upgrade) ...[
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            const Expanded(child: Divider()),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 12),
                              child: Text('or', style: theme.textTheme.bodySmall),
                            ),
                            const Expanded(child: Divider()),
                          ],
                        ),
                        const SizedBox(height: 12),
                        OutlinedButton.icon(
                          onPressed: isBusy ? null : () => run(ref.read(authServiceProvider).continueAsGuest),
                          icon: const Icon(Icons.person_outline_rounded),
                          label: const Text('Continue as guest'),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Guests can try everything with a smaller daily AI limit. You can create an account later without losing anything.',
                          textAlign: TextAlign.center,
                          style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

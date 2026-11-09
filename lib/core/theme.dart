import 'package:flutter/material.dart';

/// Colors pulled from the frog logo: olive green on warm cream.
class BrandColors {
  static const olive = Color(0xFF6B7F2A);
  static const cream = Color(0xFFF7F3DC);
  static const forest = Color(0xFF1F2A14);
  static const pond = Color(0xFF6FA3A0);

  static const gradeColors = <String, Color>{
    'A': Color(0xFF1B8A4B),
    'B': Color(0xFF7CB342),
    'C': Color(0xFFF2B705),
    'D': Color(0xFFEF7D22),
    'E': Color(0xFFD7352B),
  };

  static Color forGrade(String? grade) => gradeColors[grade] ?? const Color(0xFF9E9E9E);

  static const verdictColors = <String, Color>{
    'great': Color(0xFF1B8A4B),
    'good': Color(0xFF7CB342),
    'okay': Color(0xFFF2B705),
    'limit': Color(0xFFEF7D22),
    'avoid': Color(0xFFD7352B),
  };
}

ThemeData buildTheme(Brightness brightness) {
  final isDark = brightness == Brightness.dark;
  final colorScheme = ColorScheme.fromSeed(
    seedColor: BrandColors.olive,
    brightness: brightness,
    surface: isDark ? const Color(0xFF15190F) : const Color(0xFFFCFAF0),
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: colorScheme.surface,
    visualDensity: VisualDensity.standard,
    appBarTheme: AppBarThemeData(
      backgroundColor: colorScheme.surface,
      surfaceTintColor: Colors.transparent,
      centerTitle: false,
      titleTextStyle: TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.w700,
        color: colorScheme.onSurface,
      ),
    ),
    cardTheme: CardThemeData(
      elevation: 0,
      color: colorScheme.surfaceContainerLow,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: colorScheme.outlineVariant.withValues(alpha: 0.6)),
      ),
    ),
    chipTheme: ChipThemeData(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
    ),
    inputDecorationTheme: InputDecorationThemeData(
      filled: true,
      fillColor: colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide.none,
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(0, 48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(0, 48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    ),
    snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
  );
}

/// Width at which layouts switch to a side rail and multiple columns.
const wideBreakpoint = 840.0;

/// Max readable content width on large screens.
const contentMaxWidth = 1180.0;

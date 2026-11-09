import 'package:flutter/material.dart';

import '../core/theme.dart';
import '../models/food.dart';

/// A compact A-E grade tile. Shows a dash when there isn't enough data to score.
class HealthScoreBadge extends StatelessWidget {
  const HealthScoreBadge({super.key, required this.healthScore, this.size = 44});

  final HealthScore? healthScore;
  final double size;

  @override
  Widget build(BuildContext context) {
    final score = healthScore;
    final color = BrandColors.forGrade(score?.grade);
    final label = score == null ? 'Not enough nutrition data to score' : 'Health grade ${score.grade}, ${score.score} out of 100';

    return Semantics(
      label: label,
      excludeSemantics: true,
      child: Tooltip(
        message: score == null ? 'Not enough data to score' : 'Score ${score.score}/100',
        child: Container(
          width: size,
          height: size,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: score == null ? color.withValues(alpha: 0.18) : color,
            borderRadius: BorderRadius.circular(size * 0.28),
          ),
          child: Text(
            score?.grade ?? '–',
            style: TextStyle(
              color: score == null ? color : Colors.white,
              fontWeight: FontWeight.w800,
              fontSize: size * 0.48,
              height: 1,
            ),
          ),
        ),
      ),
    );
  }
}

/// The A-E scale with the active grade raised, used on the detail page.
class HealthScoreScale extends StatelessWidget {
  const HealthScoreScale({super.key, required this.grade});

  final String? grade;

  @override
  Widget build(BuildContext context) {
    const grades = ['A', 'B', 'C', 'D', 'E'];
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (final item in grades)
          AnimatedContainer(
            duration: const Duration(milliseconds: 250),
            margin: const EdgeInsets.symmetric(horizontal: 2),
            width: item == grade ? 40 : 30,
            height: item == grade ? 40 : 30,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: BrandColors.forGrade(item).withValues(alpha: item == grade ? 1 : 0.35),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              item,
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w800,
                fontSize: item == grade ? 20 : 14,
              ),
            ),
          ),
      ],
    );
  }
}

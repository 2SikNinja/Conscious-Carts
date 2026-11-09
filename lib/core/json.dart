/// Helpers for reading loosely typed JSON from Cloud Functions and Firestore.
///
/// Callable results arrive as `Map<Object?, Object?>` on mobile and as
/// JS-backed maps on web, so everything is normalized here once.
library;

Map<String, dynamic> asJsonMap(Object? value) {
  if (value is Map) {
    return value.map((key, item) => MapEntry(key.toString(), normalizeJson(item)));
  }
  return <String, dynamic>{};
}

Object? normalizeJson(Object? value) {
  if (value is Map) return asJsonMap(value);
  if (value is List) return value.map(normalizeJson).toList();
  return value;
}

List<Map<String, dynamic>> asJsonList(Object? value) {
  if (value is! List) return const [];
  return value.whereType<Map<dynamic, dynamic>>().map(asJsonMap).toList();
}

List<String> asStringList(Object? value) {
  if (value is! List) return const [];
  return value.whereType<String>().toList();
}

String? asString(Object? value) {
  if (value == null) return null;
  final text = value.toString().trim();
  return text.isEmpty ? null : text;
}

int? asInt(Object? value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value);
  return null;
}

double? asDouble(Object? value) {
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value);
  return null;
}

Map<String, double> asDoubleMap(Object? value) {
  final map = asJsonMap(value);
  final result = <String, double>{};
  map.forEach((key, item) {
    final number = asDouble(item);
    if (number != null) result[key] = number;
  });
  return result;
}

Map<String, String> asStringMap(Object? value) {
  final map = asJsonMap(value);
  return map.map((key, item) => MapEntry(key, item?.toString() ?? ''));
}

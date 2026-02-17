import { describe, it, expect } from 'vitest';
import { isTemporalKey, isSpatialKey } from './properties';

describe('isTemporalKey', () => {
  it('should identify exact temporal keys', () => {
    expect(isTemporalKey('date')).toBe(true);
    expect(isTemporalKey('time')).toBe(true);
    expect(isTemporalKey('deadline')).toBe(true);
    expect(isTemporalKey('start')).toBe(true);
    expect(isTemporalKey('end')).toBe(true);
    expect(isTemporalKey('due')).toBe(true);
    expect(isTemporalKey('year')).toBe(true);
    expect(isTemporalKey('month')).toBe(true);
    expect(isTemporalKey('today')).toBe(true);
    expect(isTemporalKey('tomorrow')).toBe(true);
  });

  it('should identify camelCase temporal keys', () => {
    expect(isTemporalKey('startDate')).toBe(true);
    expect(isTemporalKey('endDate')).toBe(true);
    expect(isTemporalKey('createdAt')).toBe(true);
    expect(isTemporalKey('updatedAt')).toBe(true);
    expect(isTemporalKey('startTime')).toBe(true);
    expect(isTemporalKey('dueAt')).toBe(true);
    expect(isTemporalKey('publishDate')).toBe(true);
  });

  it('should identify snake_case temporal keys', () => {
    expect(isTemporalKey('start_date')).toBe(true);
    expect(isTemporalKey('end_time')).toBe(true);
    expect(isTemporalKey('created_at')).toBe(true);
    expect(isTemporalKey('updated_at')).toBe(true);
  });

  it('should not identify non-temporal keys', () => {
    expect(isTemporalKey('candidate')).toBe(false);
    expect(isTemporalKey('mandate')).toBe(false);
    expect(isTemporalKey('update')).toBe(false); // ends with date? No, ends with ate.
    expect(isTemporalKey('friend')).toBe(false); // ends with end
    expect(isTemporalKey('estimate')).toBe(false); // contains time
    expect(isTemporalKey('name')).toBe(false);
  });
});

describe('isSpatialKey', () => {
  it('should identify exact spatial keys', () => {
    expect(isSpatialKey('location')).toBe(true);
    expect(isSpatialKey('geo')).toBe(true);
    expect(isSpatialKey('place')).toBe(true);
    expect(isSpatialKey('coords')).toBe(true);
    expect(isSpatialKey('address')).toBe(true);
    expect(isSpatialKey('city')).toBe(true);
    expect(isSpatialKey('venue')).toBe(true);
    expect(isSpatialKey('lat')).toBe(true);
    expect(isSpatialKey('lon')).toBe(true);
  });

  it('should identify camelCase spatial keys', () => {
    expect(isSpatialKey('myLocation')).toBe(true);
    expect(isSpatialKey('birthPlace')).toBe(true);
    expect(isSpatialKey('homeAddress')).toBe(true);
    expect(isSpatialKey('geoCoords')).toBe(true);
  });

  it('should identify snake_case spatial keys', () => {
    expect(isSpatialKey('my_location')).toBe(true);
    expect(isSpatialKey('birth_place')).toBe(true);
    expect(isSpatialKey('home_address')).toBe(true);
  });

  it('should not identify non-spatial keys', () => {
    expect(isSpatialKey('replace')).toBe(false);
    expect(isSpatialKey('surgeon')).toBe(false); // contains geo
    expect(isSpatialKey('video')).toBe(false);
    expect(isSpatialKey('name')).toBe(false);
  });
});

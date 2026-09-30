import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Comprehensive error result for any mutation
 */
export interface MutationResult<T = null> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: string;
        isRLSFailure?: boolean; // True if RLS silently prevented the mutation
    };
}

function isPolicyError(error: { code?: string; message?: string }): boolean {
    return error.code === 'PGRST116' || Boolean(error.message?.includes('policy'));
}

function toSafeError(error: { code?: string; message?: string; details?: string }) {
    return {
        code: 'DATABASE_ERROR',
        message: 'Database mutation failed',
        details: error.details ? 'Details available' : undefined,
        isRLSFailure: isPolicyError(error)
    };
}

function toUnexpectedError() {
    return {
        code: 'UNEXPECTED_ERROR',
        message: 'Unexpected mutation error',
        isRLSFailure: false
    };
}

/**
 * Safe Delete Operation with RLS Detection
 * Checks if the row was actually deleted (count > 0)
 * If count === 0, treats it as an RLS failure even if error is null
 */
export async function safeDelete(
    supabase: SupabaseClient,
    table: string,
    filters: { [key: string]: any }
): Promise<MutationResult> {
    try {
        const query = supabase.from(table).delete({ count: 'exact' });

        // Apply filters
        let filteredQuery = query;
        for (const [key, value] of Object.entries(filters)) {
            filteredQuery = filteredQuery.eq(key, value);
        }

        const { count, error } = await filteredQuery;

        if (error) {
            console.error('[SafeDelete] Error');
            return {
                success: false,
                error: toSafeError(error)
            };
        }

        // Check if RLS silently prevented deletion
        if (!count || count === 0) {
            console.warn(`[SafeDelete] No rows affected - possible RLS failure`);
            return {
                success: false,
                error: {
                    code: 'RLS_SILENT_FAILURE',
                    message: 'Row could not be deleted. Check your permissions.',
                    isRLSFailure: true
                }
            };
        }

        return { success: true };
    } catch {
        console.error('[SafeDelete] Unexpected error');
        return {
            success: false,
            error: toUnexpectedError()
        };
    }
}

/**
 * Safe Update Operation with RLS Detection
 */
export async function safeUpdate(
    supabase: SupabaseClient,
    table: string,
    updates: { [key: string]: any },
    filters: { [key: string]: any }
): Promise<MutationResult<any>> {
    try {
        let query = supabase.from(table).update(updates);

        // Apply filters
        for (const [key, value] of Object.entries(filters)) {
            query = query.eq(key, value);
        }

        const { data, error } = await query.select();

        if (error) {
            console.error('[SafeUpdate] Error');
            return {
                success: false,
                error: toSafeError(error)
            };
        }

        // Check if RLS silently prevented update
        if (!data || data.length === 0) {
            console.warn(`[SafeUpdate] No rows affected - possible RLS failure`);
            return {
                success: false,
                error: {
                    code: 'RLS_SILENT_FAILURE',
                    message: 'Row could not be updated. Check your permissions.',
                    isRLSFailure: true
                }
            };
        }

        return { success: true, data };
    } catch {
        console.error('[SafeUpdate] Unexpected error');
        return {
            success: false,
            error: toUnexpectedError()
        };
    }
}

/**
 * Safe Insert Operation with RLS Detection
 */
export async function safeInsert(
    supabase: SupabaseClient,
    table: string,
    record: { [key: string]: any }
): Promise<MutationResult<any>> {
    try {
        const { data, error } = await supabase
            .from(table)
            .insert([record])
            .select();

        if (error) {
            console.error('[SafeInsert] Error');
            return {
                success: false,
                error: toSafeError(error)
            };
        }

        // Check if RLS silently prevented insert
        if (!data || data.length === 0) {
            console.warn(`[SafeInsert] No rows returned - possible RLS failure`);
            return {
                success: false,
                error: {
                    code: 'RLS_SILENT_FAILURE',
                    message: 'Record could not be inserted. Check your permissions.',
                    isRLSFailure: true
                }
            };
        }

        return { success: true, data: data[0] };
    } catch {
        console.error('[SafeInsert] Unexpected error');
        return {
            success: false,
            error: toUnexpectedError()
        };
    }
}

/**
 * Batch Delete with RLS Detection
 */
export async function safeBatchDelete(
    supabase: SupabaseClient,
    table: string,
    ids: string[],
    userId: string
): Promise<MutationResult> {
    if (ids.length === 0) {
        return { success: true };
    }

    try {
        const { count, error } = await supabase
            .from(table)
            .delete({ count: 'exact' })
            .in('id', ids)
            .eq('user_id', userId);

        if (error) {
            console.error('[SafeBatchDelete] Error');
            return {
                success: false,
                error: toSafeError(error)
            };
        }

        if (!count || count === 0) {
            console.warn(`[SafeBatchDelete] No rows affected - possible RLS failure`);
            return {
                success: false,
                error: {
                    code: 'RLS_SILENT_FAILURE',
                    message: 'Records could not be deleted. Check your permissions.',
                    isRLSFailure: true
                }
            };
        }

        if (count < ids.length) {
            console.warn('[SafeBatchDelete] Partial delete');
        }

        return { success: true };
    } catch {
        console.error('[SafeBatchDelete] Unexpected error');
        return {
            success: false,
            error: toUnexpectedError()
        };
    }
}

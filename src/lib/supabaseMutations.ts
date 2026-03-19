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
        console.log(`[SafeDelete] Deleting from ${table}:`, filters);

        const query = supabase.from(table).delete();

        // Apply filters
        let filteredQuery = query;
        for (const [key, value] of Object.entries(filters)) {
            filteredQuery = filteredQuery.eq(key, value);
        }

        const { count, error } = await filteredQuery;

        if (error) {
            console.error(`[SafeDelete] Error:`, error);
            return {
                success: false,
                error: {
                    code: error.code || 'UNKNOWN',
                    message: error.message,
                    details: error.details,
                    isRLSFailure: error.code === 'PGRST116' || error.message.includes('policy')
                }
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

        console.log(`[SafeDelete] Success - ${count} row(s) deleted`);
        return { success: true };
    } catch (err) {
        console.error(`[SafeDelete] Unexpected error:`, err);
        return {
            success: false,
            error: {
                code: 'UNEXPECTED_ERROR',
                message: err instanceof Error ? err.message : 'Unknown error',
                isRLSFailure: false
            }
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
        console.log(`[SafeUpdate] Updating ${table}:`, { updates, filters });

        let query = supabase.from(table).update(updates);

        // Apply filters
        for (const [key, value] of Object.entries(filters)) {
            query = query.eq(key, value);
        }

        const { data, count, error } = await query.select();

        if (error) {
            console.error(`[SafeUpdate] Error:`, error);
            return {
                success: false,
                error: {
                    code: error.code || 'UNKNOWN',
                    message: error.message,
                    isRLSFailure: error.code === 'PGRST116' || error.message.includes('policy')
                }
            };
        }

        // Check if RLS silently prevented update
        if (!count || count === 0) {
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

        console.log(`[SafeUpdate] Success - ${count} row(s) updated`);
        return { success: true, data };
    } catch (err) {
        console.error(`[SafeUpdate] Unexpected error:`, err);
        return {
            success: false,
            error: {
                code: 'UNEXPECTED_ERROR',
                message: err instanceof Error ? err.message : 'Unknown error',
                isRLSFailure: false
            }
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
        console.log(`[SafeInsert] Inserting into ${table}:`, record);

        const { data, error, count } = await supabase
            .from(table)
            .insert([record])
            .select();

        if (error) {
            console.error(`[SafeInsert] Error:`, error);
            return {
                success: false,
                error: {
                    code: error.code || 'UNKNOWN',
                    message: error.message,
                    isRLSFailure: error.code === 'PGRST116' || error.message.includes('policy')
                }
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

        console.log(`[SafeInsert] Success - record inserted`);
        return { success: true, data: data[0] };
    } catch (err) {
        console.error(`[SafeInsert] Unexpected error:`, err);
        return {
            success: false,
            error: {
                code: 'UNEXPECTED_ERROR',
                message: err instanceof Error ? err.message : 'Unknown error',
                isRLSFailure: false
            }
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
        console.log(`[SafeBatchDelete] Deleting ${ids.length} records from ${table}`);

        const { count, error } = await supabase
            .from(table)
            .delete()
            .in('id', ids)
            .eq('user_id', userId);

        if (error) {
            console.error(`[SafeBatchDelete] Error:`, error);
            return {
                success: false,
                error: {
                    code: error.code || 'UNKNOWN',
                    message: error.message,
                    isRLSFailure: error.code === 'PGRST116' || error.message.includes('policy')
                }
            };
        }

        if (!count || count === 0) {
            console.warn(`[SafeBatchDelete] No rows affected - possible RLS failure`);
            return {
                success: false,
                error: {
                    code: 'RLS_SILENT_FAILURE',
                    message: `None of the ${ids.length} records could be deleted. Check your permissions.`,
                    isRLSFailure: true
                }
            };
        }

        if (count < ids.length) {
            console.warn(`[SafeBatchDelete] Partial delete: ${count}/${ids.length} rows affected`);
        }

        console.log(`[SafeBatchDelete] Success - ${count} row(s) deleted`);
        return { success: true };
    } catch (err) {
        console.error(`[SafeBatchDelete] Unexpected error:`, err);
        return {
            success: false,
            error: {
                code: 'UNEXPECTED_ERROR',
                message: err instanceof Error ? err.message : 'Unknown error',
                isRLSFailure: false
            }
        };
    }
}

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireRole } from '@/lib/rbac'
import { z } from 'zod'

const memberListSchema = z.object({
  page: z.string().optional().transform((v) => v ? parseInt(v, 10) : 1),
  limit: z.string().optional().transform((v) => v ? parseInt(v, 10) : 20),
  search: z.string().optional(),
})

export async function GET(request: NextRequest): Promise<NextResponse> {
  return requireRole(['admin', 'treasurer', 'loan_officer'])(request, async (_req, session) => {
    try {
      const { searchParams } = new URL(request.url)
      const { page, limit, search } = memberListSchema.parse({
        page: searchParams.get('page'),
        limit: searchParams.get('limit'),
        search: searchParams.get('search') || undefined,
      })

      const offset = (page - 1) * limit
      let where = 'WHERE m.is_deleted = false'
      const params: unknown[] = []

      if (search) {
        where += `AND (m.first_name ILIKE $${params.length + 1} OR m.last_name ILIKE $${params.length + 2} OR m.member_no ILIKE $${params.length + 3} OR m.email ILIKE $${params.length + 4})`
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
      }

      const countResult = await query(
        `SELECT COUNT(*) FROM members m ${where}`,
        params
      )
      const total = parseInt(countResult.rows[0].count, 10)

      const result = await query(
        `SELECT m.id, m.member_no, m.first_name, m.last_name, m.phone, m.email, m.id_number,
                m.status, m.created_at, m.monthly_income,
                u.id as user_id, u.email as user_email, u.role as user_role, u.is_active
         FROM members m
         LEFT JOIN users u ON m.user_id = u.id
         ${where}
         ORDER BY m.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset]
      )

      return NextResponse.json({
        members: result.rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      })
    } catch {
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
    }
  })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return requireRole(['admin'])(request, async (_req, session) => {
    try {
      const body = await request.json()
      const schema = z.object({
        memberNo: z.string().min(1, 'Member number is required'),
        firstName: z.string().min(1, 'First name is required'),
        lastName: z.string().min(1, 'Last name is required'),
        phone: z.string().optional(),
        email: z.string().email('Invalid email').optional().or(z.literal('')),
        idNumber: z.string().optional(),
        dateOfBirth: z.string().optional(),
        gender: z.string().optional(),
        occupation: z.string().optional(),
        employer: z.string().optional(),
        monthlyIncome: z.number().min(0).optional().default(0),
        status: z.string().default('active'),
      })

      const { data, error } = (() => {
        const result = schema.safeParse(body)
        if (!result.success) {
          return { data: null as any, error: result.error.errors.map((e) => e.message).join(', ') }
        }
        return { data: result.data, error: null }
      })()

      if (error) {
        return NextResponse.json({ error }, { status: 400 })
      }

      const existing = await query(`SELECT id FROM members WHERE member_no = $1`, [data.memberNo])
      if (existing.rows.length > 0) {
        return NextResponse.json({ error: 'Member number already exists' }, { status: 409 })
      }

      const result = await query(
        `INSERT INTO members (member_no, first_name, last_name, phone, email, id_number,
                  date_of_birth, gender, occupation, employer, monthly_income, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id, member_no, first_name, last_name, phone, email, status, created_at`,
        [data.memberNo, data.firstName, data.lastName, data.phone || null, data.email || null,
         data.idNumber || null, data.dateOfBirth || null, data.gender || null,
         data.occupation || null, data.employer || null, data.monthlyIncome, data.status]
      )

      return NextResponse.json({ member: result.rows[0] }, { status: 201 })
    } catch {
      return NextResponse.json({ error: 'Failed to create member' }, { status: 500 })
    }
  })
}
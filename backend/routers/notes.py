"""
Notes CRUD endpoints.
"""

from __future__ import annotations

from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Note

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class NoteCreate(BaseModel):
    ticker: str
    date: date
    title: str
    body: str


class NoteUpdate(BaseModel):
    title: str
    body: str


class NoteOut(BaseModel):
    id: int
    ticker: str
    date: date
    title: str
    body: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


def _note_to_dict(note: Note) -> dict[str, Any]:
    return {
        "id": note.id,
        "ticker": note.ticker,
        "date": note.date.isoformat(),
        "title": note.title,
        "body": note.body,
        "created_at": note.created_at.isoformat() if note.created_at else None,
        "updated_at": note.updated_at.isoformat() if note.updated_at else None,
    }


# ---------------------------------------------------------------------------
# POST /api/notes
# ---------------------------------------------------------------------------

@router.post("/notes", status_code=201)
async def create_note(
    payload: NoteCreate, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    note = Note(
        ticker=payload.ticker.upper(),
        date=payload.date,
        title=payload.title,
        body=payload.body,
    )
    db.add(note)
    await db.flush()
    await db.refresh(note)
    return _note_to_dict(note)


# ---------------------------------------------------------------------------
# GET /api/notes
# ---------------------------------------------------------------------------

@router.get("/notes")
async def list_notes(
    ticker: str | None = Query(default=None),
    date: date | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    stmt = select(Note).order_by(Note.date.desc(), Note.created_at.desc())

    if ticker:
        stmt = stmt.where(Note.ticker == ticker.upper())
    if date:
        stmt = stmt.where(Note.date == date)

    result = await db.execute(stmt)
    notes = result.scalars().all()
    return [_note_to_dict(n) for n in notes]


# ---------------------------------------------------------------------------
# PUT /api/notes/{id}
# ---------------------------------------------------------------------------

@router.put("/notes/{note_id}")
async def update_note(
    note_id: int,
    payload: NoteUpdate,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    note = await db.get(Note, note_id)
    if note is None:
        raise HTTPException(status_code=404, detail=f"Note {note_id} not found")

    note.title = payload.title
    note.body = payload.body
    await db.flush()
    await db.refresh(note)
    return _note_to_dict(note)


# ---------------------------------------------------------------------------
# DELETE /api/notes/{id}
# ---------------------------------------------------------------------------

@router.delete("/notes/{note_id}", status_code=200)
async def delete_note(
    note_id: int,
    db: AsyncSession = Depends(get_db),
) -> dict:
    note = await db.get(Note, note_id)
    if note is None:
        raise HTTPException(status_code=404, detail=f"Note {note_id} not found")

    await db.delete(note)
    return {"deleted": note_id}

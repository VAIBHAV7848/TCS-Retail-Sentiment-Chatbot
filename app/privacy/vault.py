"""
In-memory encrypted PII Vault for storing original values mapped to placeholders.
"""

from __future__ import annotations

import json
import uuid
from typing import Dict, Optional

from cryptography.fernet import Fernet
import structlog

logger = structlog.get_logger(__name__)


class PIIVault:
    """
    In-memory encrypted store for PII mappings.
    Encrypts placeholder-to-value maps using Fernet symmetric encryption.
    """

    def __init__(self, encryption_key: Optional[str] = None):
        if encryption_key and isinstance(encryption_key, str) and len(encryption_key.strip()) > 0:
            # Check if key is valid Fernet key; if not, generate or pad
            try:
                self._key = encryption_key.encode("utf-8")
                self._cipher = Fernet(self._key)
            except Exception:
                # Fallback to freshly generated key if provided key is invalid
                self._key = Fernet.generate_key()
                self._cipher = Fernet(self._key)
        else:
            self._key = Fernet.generate_key()
            self._cipher = Fernet(self._key)

        # Storage: vault_ref -> (session_id, encrypted_bytes)
        self._vault_store: Dict[str, tuple[str, bytes]] = {}
        # Session index: session_id -> set of vault_refs
        self._session_index: Dict[str, set[str]] = {}

    def store(self, session_id: str, placeholder_map: dict) -> str:
        """
        Encrypt and store the placeholder map for a session.
        Returns a UUID vault_ref.
        """
        vault_ref = str(uuid.uuid4())
        data_json = json.dumps(placeholder_map)
        encrypted_data = self._cipher.encrypt(data_json.encode("utf-8"))

        self._vault_store[vault_ref] = (session_id, encrypted_data)
        if session_id not in self._session_index:
            self._session_index[session_id] = set()
        self._session_index[session_id].add(vault_ref)

        logger.debug(
            "pii_vault_stored",
            session_id=session_id,
            vault_ref=vault_ref,
            entity_count=len(placeholder_map),
        )
        return vault_ref

    def retrieve(self, vault_ref: str) -> Optional[dict]:
        """
        Decrypt and retrieve the placeholder map by vault_ref.
        """
        record = self._vault_store.get(vault_ref)
        if not record:
            return None
        _, encrypted_data = record
        try:
            decrypted = self._cipher.decrypt(encrypted_data)
            return json.loads(decrypted.decode("utf-8"))
        except Exception as e:
            logger.error("pii_vault_decrypt_failed", vault_ref=vault_ref, error=str(e))
            return None

    def delete(self, vault_ref: str) -> None:
        """
        Delete a single vault entry by vault_ref.
        """
        if vault_ref in self._vault_store:
            session_id, _ = self._vault_store.pop(vault_ref)
            if session_id in self._session_index:
                self._session_index[session_id].discard(vault_ref)
                if not self._session_index[session_id]:
                    del self._session_index[session_id]
            logger.debug("pii_vault_deleted", vault_ref=vault_ref)

    def delete_session(self, session_id: str) -> None:
        """
        Delete all vault entries associated with a session_id.
        """
        refs = self._session_index.pop(session_id, set())
        for ref in refs:
            self._vault_store.pop(ref, None)
        logger.debug("pii_vault_session_cleared", session_id=session_id, count=len(refs))

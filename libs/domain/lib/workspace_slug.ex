defmodule Domain.WorkspaceSlug do
  @moduledoc """
  Pure normalization and validation rules for readable workspace slugs.
  """

  @max_length 50
  @slug_pattern ~r/^[a-z0-9]+(?:-[a-z0-9]+)*$/

  @doc """
  Converts a workspace name into a lowercase kebab-case slug no longer than 50 characters.
  """
  @spec normalize(String.t()) :: String.t()
  def normalize(name) when is_binary(name) do
    slug =
      name
      |> String.normalize(:nfd)
      |> String.downcase()
      |> String.replace(~r/\p{M}/u, "")
      |> String.replace(~r/[^a-z0-9]+/u, "-")
      |> String.trim("-")
      |> String.slice(0, @max_length)
      |> String.trim("-")

    if slug == "", do: "workspace", else: slug
  end

  def normalize(_name), do: "workspace"

  @doc """
  Returns whether a value is a valid lowercase workspace slug.
  """
  @spec valid?(term()) :: boolean()
  def valid?(slug) when is_binary(slug) do
    byte_size(slug) in 1..@max_length and Regex.match?(@slug_pattern, slug)
  end

  def valid?(_slug), do: false

  @doc """
  Appends a collision suffix while preserving the maximum slug length.
  """
  @spec with_suffix(String.t(), pos_integer()) :: String.t()
  def with_suffix(base_slug, suffix)
      when is_binary(base_slug) and is_integer(suffix) and suffix > 1 do
    suffix = "-#{suffix}"
    String.slice(base_slug, 0, @max_length - byte_size(suffix)) <> suffix
  end
end

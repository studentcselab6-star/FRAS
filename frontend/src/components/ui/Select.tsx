import React from 'react'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  className = '',
  id,
  ...props
}) => {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-gray-600 mb-2">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full px-3 py-2 border-2 rounded-lg text-base transition-all duration-300 bg-white/80 appearance-none cursor-pointer ${
          error 
            ? 'border-red-500 focus:border-red-500' 
            : 'border-gray-200 focus:border-blue-500'
        } focus:outline-none focus:shadow-[0_0_0_3px_rgba(102,126,234,0.1)] -translate-y-0.5 ${className}`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20id%3D%22SVGRepo_bgCarrier%22%20stroke-width%3D%220%22%3E%3C%2Fg%3E%3Cg%20id%3D%22SVGRepo_tracerCarrier%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3C%2Fg%3E%3Cg%20id%3D%22SVGRepo_iconCarrier%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20clip-rule%3D%22evenodd%22%20d%3D%22M12.7071%2014.7071C12.3166%2015.0976%2011.6834%2015.0976%2011.2929%2014.7071L6.29289%209.70711C5.90237%209.31658%205.90237%208.68342%206.29289%208.29289C6.68342%207.90237%207.31658%207.90237%207.70711%208.29289L12%2012.5858L16.2929%208.29289C16.6834%207.90237%2017.3166%207.90237%2017.7071%208.29289C18.0976%208.68342%2018.0976%209.31658%2017.7071%209.70711L12.7071%2014.7071Z%22%20fill%3D%22%23000000%22%3E%3C%2Fpath%3E%3C%2Fg%3E%3C%2Fsvg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 15px center',
          backgroundSize: '16px',
          paddingRight: '40px'
        }}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  )
}